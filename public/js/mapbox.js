/* eslint-disable */
export const displayMap = (locations) => {
  // console.log(locations);

  mapboxgl.accessToken =
    'pk.eyJ1Ijoic2ltYm9sbWluYSIsImEiOiJjbDI3Y3o1cmwwN2NxM2xxbDlmdWh3bGk4In0.tG73WvLC0rOL-Nk61Q7O5Q';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/simbolmina/cl27dpt7n00hs14nu94uglp0k',
    scrollZoom: false,
    //   center: [-118.113491, 34.111745],
    //   zoom: 4,
    //   interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //create marker

    const el = document.createElement('div');
    el.className = 'marker';

    //add marker

    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    //extend map bounds to include current location

    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
