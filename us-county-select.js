class UsCountySelect extends HTMLElement {
    #spatialIndex = null;
    #selected = new Map();

    #settings = {
        'county-border-color': 'black',
        'county-border-opacity': 1,
        'county-border-width': 1,
        'county-fill-color': 'transparent',
        'county-fill-opacity': 0.95,
        'county-hover-color': 'lime',
        'county-selected-color': 'green',
        'debug': window.location.search.includes('debug'),
        'initial-lat': 39.5,
        'initial-lng': -98.35,
        'initial-zoom': 4,
        'map-opacity': 0.75,
        'map-tile-url': "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        'max-zoom': 7,
        'min-zoom': 3,
        'neighbors': true,
        'state-border-color': 'black',
        'state-border-width': 2,
    };

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });

        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
        shadow.appendChild(styleLink);

        const leafletScript = document.createElement('script');
        leafletScript.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
        leafletScript.async = true;
        leafletScript.onload = () => this.#initMap();
        document.body.appendChild(leafletScript);

        if (this.#settings.neighbors) {
            const turfScript = document.createElement('script');
            turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@7.0.0/turf.min.js';
            turfScript.async = true;
            document.body.appendChild(turfScript);

            const rbushScript = document.createElement('script');
            rbushScript.src = 'https://cdn.jsdelivr.net/npm/rbush@4.0.1/rbush.min.js';
            rbushScript.async = true;
            rbushScript.onload = () => this.#loadSpatialIndex();
            document.body.appendChild(rbushScript);
        }

        const mapContainer = document.createElement('article');
        mapContainer.id = 'map';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        shadow.appendChild(mapContainer);

        const attributesToCheck = [
            'county-border-color',
            'county-border-opacity',
            'county-border-width',
            'county-fill-color',
            'county-fill-opacity',
            'county-hover-color',
            'county-selected-color',
            'debug',
            'initial-lat',
            'initial-lng',
            'initial-zoom',
            'map-tile-url',
            'map-opacity',
            'max-zoom',
            'min-zoom',
            'state-border-color',
            'state-border-width',
        ];

        for (const attr of attributesToCheck) {
            const value = this.getAttribute(attr);
            if (value !== null) {
                this.#settings[attr] = isNaN(Number(value)) ? value : Number(value);
            }
        }

        if (this.#settings.debug) console.log('[UsCountySelect] Settings', JSON.stringify(this.#settings, null, 4));
    }

    #initMap() {
        const map = L.map(this.shadowRoot.querySelector('#map'), {
            center: [this.#settings["initial-lat"], this.#settings['initial-lng']],
            zoom: this.#settings['initial-zoom'],
            minZoom: this.#settings['min-zoom'],
            maxZoom: this.#settings['max-zoom'],
        });

        L.tileLayer(this.#settings['map-tile-url'], {
            attribution: false,
            opacity: this.#settings['map-opacity'],
        }).addTo(map);

        this.mapInstance = map;
        this.#loadGeoJson();
        map.on('zoomend', () => this.#updateStylesOnZoom());
    }

    async #loadGeoJson() {
        try {
            const [stateRes, countyRes] = await Promise.all([
                fetch('./us-states.json'),
                fetch('./us-counties.json')
            ]);

            const stateGeoJson = await stateRes.json();

            this.stateLayer = L.geoJSON(stateGeoJson, {
                style: () => this.#getStateStyle(),
            }).addTo(this.mapInstance);

            const countyGeoJson = await countyRes.json();

            this.countyLayer = L.geoJSON(countyGeoJson, {
                style: (feature) => this.#getCountyStyle(feature),
                onEachFeature: this.#handleFeatureEvents.bind(this),
            }).addTo(this.mapInstance);
        }
        catch (error) {
            console.error('[UsCountySelect] Error loading GeoJSON data:', error);
        }
    }

    #handleFeatureEvents(feature, layer) {
        layer.on({
            click: (e) => {
                e.target.feature.properties.selected = !e.target.feature.properties.selected;
                e.target.setStyle({
                    fillColor: e.target.feature.properties.selected ? this.#settings['county-selected-color'] : this.#settings['county-fill-color']
                });

                const detail = {
                    properties: e.target.feature.properties,
                    neighbors: this.#settings.neighbors ? this.#findNN(feature) : null,
                };

                if (e.target.feature.properties.selected) {
                    this.#selected.set(e.target.feature.properties.GEO_ID, detail);
                } else {
                    this.#selected.delete(e.target.feature.properties.GEO_ID);
                }

                const eventName = e.target.feature.properties.selected ? 'izel-map-selected' : 'izel-map-unselected';
                if (this.#settings.debug) console.log('[UsCountySelect] emitting event ', eventName, detail);
                this.dispatchEvent(new CustomEvent(eventName, { detail }));

                if (this.#settings.debug) console.log('[UsCountySelect] emitting event izel-map-changed', detail);
                this.dispatchEvent(new CustomEvent('izel-map-selection-changed', { detail }));
            },
            mouseover: (e) => {
                e.target.setStyle({
                    fillColor: this.#settings['county-hover-color'],
                    fillOpacity: 0.7,
                });
                const tooltipContent = feature.properties.NAME || 'Unnamed ' + e.target.feature.properties.LSAD;
                e.target.bindTooltip(tooltipContent, { permanent: false, direction: 'top' }).openTooltip();
            },
            mouseout: (e) => {
                e.target.setStyle(this.#getCountyStyle(feature));
                e.target.unbindTooltip();
            },
        });
    }

    getSelected() {
        if (this.#settings.debug) console.log('[UsCountySelect] getSelected:', this.#selected);
        return this.#selected;
    }

    #getStateStyle() {
        return {
            weight: this.#settings['state-border-width'],
            color: this.#settings['state-border-color'],
            fill: false,
        };
    }

    #getCountyStyle(feature) {
        const zoom = this.mapInstance.getZoom();
        const isSelected = feature.properties.selected;
        const fillColor = isSelected
            ? this.#settings['county-selected-color']
            : this.#settings['county-fill-color'];

        return {
            weight: this.#calculateDynamicWidth(zoom, 'county-border-width', 1),
            color: this.#settings['county-border-color'],
            opacity: zoom <= this.#settings['initial-zoom'] ? this.#settings['county-border-opacity'] / 2 : 1,
            fillColor: fillColor || this.#settings['county-fill-color'],
            fillOpacity: this.#settings['county-fill-opacity'],
        };
    }

    #updateStylesOnZoom() {
        if (this.countyLayer) {
            this.countyLayer.eachLayer((layer) => {
                layer.setStyle(this.#getCountyStyle(layer.feature));
            });
        }

        if (this.stateLayer) {
            this.stateLayer.setStyle({
                weight: this.#calculateDynamicWidth(this.mapInstance.getZoom(), 'state-border-width', 2),
                color: this.#settings['state-border-color'],
            });
        }
    }

    #calculateDynamicWidth(currentZoom, settingKey, defaultValue) {
        const baseWidth = this.#settings[settingKey] || defaultValue;
        const zoomFactor = 1 + (currentZoom - this.#settings['initial-zoom']) * 0.1;
        return Math.max(baseWidth * zoomFactor, 0.5);
    }

    async #loadSpatialIndex() {
        try {
            const response = await fetch('./county-spatial-index.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch spatial index: ${response.statusText}`);
            }
            const serializedIndex = await response.json();
            this.#spatialIndex = new window.RBush();
            this.#spatialIndex.fromJSON(serializedIndex);
        } catch (error) {
            console.error("Error loading spatial index:", error);
        }
    }

    #findNN(countyFeature) {
        if (turf && this.#spatialIndex) {
            const buffer = turf.buffer(countyFeature, 2, { units: "miles" });
            const bbox = turf.bbox(buffer);
            const neighbors = this.#spatialIndex.search({
                minX: bbox[0],
                minY: bbox[1],
                maxX: bbox[2],
                maxY: bbox[3],
            });

            const neighbourIds = new Set(neighbors.map(neighbour => neighbour.properties.GEO_ID));

            if (this.#settings.debug) {
                const id2fillColor = new Map();
                this.countyLayer.eachLayer(layer => {
                    const feature = layer.feature;
                    if (feature && neighbourIds.has(feature.properties.GEO_ID)) {
                        layer.setStyle({ fillColor: "lime" });
                        id2fillColor.set(feature.properties.GEO_ID, layer.options.style.fillColor);
                    }
                });

                setTimeout(() => {
                    this.countyLayer.eachLayer(layer => {
                        const feature = layer.feature;
                        if (feature && id2fillColor.has(feature.properties.GEO_ID)) {
                            layer.setStyle({ fillColor: id2fillColor[feature.properties.GEO_ID] || 'transparent' });
                        }
                    });
                }, 50);
            }

            return neighbors.map(feature => feature.properties);
        }
    }
}

customElements.define('us-county-select', UsCountySelect);
