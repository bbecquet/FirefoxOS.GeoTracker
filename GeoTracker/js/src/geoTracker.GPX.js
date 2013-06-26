var geoTracker = geoTracker || {};

geoTracker.GPX = {
  _helpers: function(doc) {
    return {
      track: function(track) {
        var trk = this.elt('trk');
        // TODO:? split in several segments (based on track stop/resume and GPS interruptions)
        var trkseg = this.elt('trkseg');
        var pos = track.positions;
        for(var i=0, l=pos.length; i<l; i++) {
          trkseg.appendChild(this.trackpoint(pos[i]));
        }
        trk.appendChild(trkseg);
        return trk;
      },

      trackpoint: function(position) {
        var trkPt = this.elt('trkpt', {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        trkPt.appendChild(this.elt('ele', null, position.coords.altitude));
        trkPt.appendChild(this.elt('time', null, geoTracker.Utils.ISODateString(new Date(position.timestamp))));
        return trkPt;
      },

      waypoint: function(marker) {

      },

      metadata: function(track) {
        var metadata = this.elt('metadata');
        metadata.appendChild(this.elt('name', null, track.title, true));
        metadata.appendChild(this.elt('time', null, geoTracker.Utils.ISODateString(track.date)));
        //metadata.appendChild(elt('bounds', {minlat: , minlon: , maxlat: , maxlon:}, null));
        return metadata;
      },

      /**
      Simplifies the creation of a named element, with optional attributes and text content (as CDATA or plain text node)
      */
      elt: function(name, attr, txt, cdata){
        var elt = doc.createElement(name);
        if(attr) {
          for(attrKey in attr) {
            elt.setAttribute(attrKey, attr[attrKey]);
          }
        }
        if(txt) {
          elt.appendChild(cdata ? doc.createCDATASection(txt) : doc.createTextNode(txt));
        }
        return elt;
      }
    }
  },

  /**
  options: 
    serialize: true to return the result as a string, false (default) to return an XML document.
  */
  exportTrack: function(track, options) {
    var doc = document.implementation.createDocument('http://www.topografix.com/GPX/1/1', '', null);
    var h = geoTracker.GPX._helpers(doc);
    var gpxElt = h.elt('gpx', {
      xmlns: 'http://www.topografix.com/GPX/1/1',
      creator: 'GeoTracker for FirefoxOS and mobile browsers'
    });
    gpxElt.appendChild(h.metadata(track));
    gpxElt.appendChild(h.track(track));

    doc.appendChild(gpxElt);

    if(options && options.serialize) {
      return (new XMLSerializer().serializeToString(doc));
    }
    return doc;
  }
}