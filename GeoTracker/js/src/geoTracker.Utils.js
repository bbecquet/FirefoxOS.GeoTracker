var geoTracker = geoTracker || {};

geoTracker.Utils = {
  // TODO: add bounds
  getTrackStats: function(track) {
    var points = track.positions;
    var dist = 0;
    var minTime = 0, time;
    var minAlt = Number.MAX_VALUE, maxAlt = Number.MIN_VALUE;
    var prevLL = null, ll = null;
    var pt;

    var labels = [];
    var values = [];
    for(var i=0;i<points.length;i++) {
      pt = points[i];
      ll = [pt.coords.latitude, pt.coords.longitude];
      if(i == 0) {
          minTime = pt.timestamp;
      } else {
          dist += geoTracker.Utils.distance(prevLL[0], prevLL[1], ll[0], ll[1]);
          time = pt.timestamp - minTime;
      }
      minAlt = Math.min(minAlt, pt.coords.altitude);
      maxAlt = Math.max(maxAlt, pt.coords.altitude);
      prevLL = ll;
      labels.push(i);
      values.push(pt.coords.altitude);
    }

    return {
      chartLabels: labels,
      chartValues: values,
      distance: dist,
      duration: time,
      minAltitude: minAlt,
      maxAltitude: maxAlt
    };
  },

  bearing: function(lat1, lng1, lat2, lng2) {
    var dLon = lng2 - lng1;
    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1)*Math.sin(lat2) -
        Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    return -Math.atan2(y, x) * 180 / Math.PI;
  },

  distance: function(lat1, lng1, lat2, lng2) {
    var R = 6378137, // earth radius in meters
        d2r = Math.PI / 180,
        dLat = (lat2 - lat1) * d2r,
        dLon = (lng2 - lng1) * d2r,
        lat1 = lat1 * d2r,
        lat2 = lat2 * d2r,
        sin1 = Math.sin(dLat / 2),
        sin2 = Math.sin(dLon / 2);

    var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  ISODateString: function(d){
    function pad(n){return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'
  }
}