# Class: `UsCountySelect`

A custom HTML element (`<us-county-select>`) that renders an interactive map using the Leaflet library. 

The map loads external Leaflet CSS and JavaScript resources, supports dynamic styling of geographical boundaries (counties and states) and interactive events such as clicks, mouseovers, and zoom updates.

## File Location

The component library is [`src/www/us-county-select.js`](src/www/us-county-select.js), with an example HTML document that hosts the map at [`src/www/search.html`](src/www/search.html).

## Attributes

| Attribute               | Description                                    | Default Value                                        |
|-------------------------|------------------------------------------------|------------------------------------------------------|
| `county-border-color`   | Border color of counties                       | `black`                                              |
| `county-border-opacity` | Opacity of county borders                      | `1`                                                  |
| `county-border-width`   | Width of county borders                        | `1`                                                  |
| `county-fill-color`     | Fill color of counties                         | `transparent`                                        |
| `county-fill-opacity`   | Opacity of county fill                         | `0.95`                                               |
| `county-hover-color`    | Color used when hovering over a county         | `lime`                                               |
| `county-selected-color` | Color used when a county is selected           | `green`                                              |
| `debug`                 | Logs things to the console, see below          | `false`                                              |
| `initial-lat`           | Initial latitude for map center                | `39.5`                                               |
| `initial-lng`           | Initial longitude for map center               | `-98.35`                                             |
| `initial-zoom`          | Initial zoom level                             | `4`                                                  |
| `map-tile-url`          | URL template for map tiles                     | `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`   |
| `max-zoom`              | Maximum zoom level                             | `7`                                                  |
| `min-zoom`              | Minimum zoom level                             | `3`                                                  |
| `map-opacity`           | Opacity of the map tiles                       | `0.5`                                                |
| `state-border-color`    | Border color of states                         | `black`                                              |
| `state-border-width`    | Width of state borders                         | `2`                                                  |


## Events

Fires `county-selection-changed`, and either `county-selected` or `county-unselected`, providing  
details of the relevant county in `properties`.

| Key         | Description         | Sample Value          |
|-------------|---------------------|-----------------------|
| CENSUSAREA  | Census area         | `6277.887`            |
| COUNTY      | County FIPS code    | `"093"`               |
| GEO_ID      | GUID                | `"0500000US06093"`    |
| LSAD        | Type of entity      | `"County"`            |
| NAME        | Human-readable name | `"Siskiyou"`          |
| STATE       | State FIPS code     | `"06"`                |
| selected    | `Boolean`           | `false`               |
| neighbors   | Bordering counties  |                       |

`neighbours` is a list of counties, each with the properties listed above.

## Methods

`getSelected` returns a `Map` where keys are `GEO_ID`s and values are as for the events detailed above.

## Logging

If you supply the `debug` attribute or if that string is found in the URL query string, some information
will be logged to the keyboard at initiation and during user interactions. Also, when a county is clicked
for selection, `neighbors` will briefly be highlighted.

## Example

See [`src/www/search.html`](src/www/search.html).

    <us-county-select 
        debug=true 
        map-opacity="1" 
        map-tile-url="https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg" 
        state-border-color="white" 
        state-border-opacity="0.75"
        county-border-color="white" 
        county-border-opacity="0.75"
    />

## Author

Copyright (C) Lee Goddard 2025. All rights reserved.
