var geoTracker = geoTracker || {};

/**
Implements an indexedDB-based repository for persistent storage
of tracks accross sessions.
Provides methods to list/add/delete tracks and positions.
*/
geoTracker.TrackStorage = function() {
  var db = null;
  function openDB(success) {
    if(db != null) {
      success();
      return;
    }
    var request = window.indexedDB.open('geotracker', 1);
    request.onupgradeneeded = function(evt) {
      console.log('Creating track store...');
      var trackStore = evt.currentTarget.result.createObjectStore(
        'tracks', { keyPath: 'id', autoIncrement: true }
      );
      console.log('Creating position store...');
      var positionStore = evt.currentTarget.result.createObjectStore(
        'positions', { keyPath: 'id' }
      );
      console.log('Creating position index...');
      var positionIdx = positionStore.createIndex(
        'positionIdx', 'trackId', { unique: false }
      );
      console.log('Database ready.')
    };
    request.onerror = function(event) {
        alert('Error opening DB: '+request.errorCode);
    };
    request.onsuccess = function(event) {
        db = request.result;
        db.onerror = function(event) {
          // Generic error handler for the whole DB
          console.error("DB error: " + event.target.errorCode);
        };
        success();
    };
  };

  var public = {
    addTrack: function(track, success, error) {
      openDB(function() {
        var trackId;
        var transaction = db.transaction(['tracks'], 'readwrite');
        transaction.oncomplete = function(event) {
          success(trackId);
        };

        var trackStore = transaction.objectStore('tracks');
        var request = trackStore.add(track);
        request.onsuccess = function(event) {
          trackId = event.target.result;
        };
      });
    },

    addPosition: function(trackId, position, success, error) {
      openDB(function() {
        var transaction = db.transaction(['positions'], 'readwrite');
        transaction.oncomplete = function(event) {
          success(position.id);
        };

        var trackStore = transaction.objectStore('positions');
        position.trackId = trackId;
        // generate a numerical Id based on timestamp and trackId for range selection
        position.id = Number(trackId) * (1e16) + position.timestamp;
        var request = trackStore.add(position);
      });
    },

    deleteTrack: function(trackId, success, error) {
      openDB(function() {
        var transaction = db.transaction(['tracks', 'positions'], 'readwrite');
        // first delete positions, then track if succesful
        var request = transaction
          .objectStore('positions')
          .delete(IDBKeyRange.bound(Number(trackId) * (1e16), (Number(trackId)+1) * (1e16), false, true))
          .onsuccess = function(event) {
            transaction
              .objectStore('tracks')
              .delete(Number(trackId))
          }

        transaction.oncomplete = function(event) {
          success();
        };
      });
    },

    getTrackList: function(success, error) {
      openDB(function() {
        var objectStore = db.transaction(['tracks'], 'readonly').objectStore('tracks');
        var request = objectStore.openCursor();
        var recordedTracks = [];
        request.onsuccess = function(event) {
          var cursor = event.target.result;
          // Too bad getAll() isn't standard...
          if (cursor) {
            recordedTracks.push(cursor.value);
            cursor.continue();
          } else {
            success(recordedTracks);
          }
        };
      });
    },

    getTrackPositions: function(trackId, success, error) {
      openDB(function() {
        var positions = [];
        var positionStore = db.transaction(['positions'], 'readonly').objectStore('positions');
        var positionIdx = positionStore.index('positionIdx');
        var request = positionIdx.openCursor(IDBKeyRange.only(Number(trackId)));
        request.onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
            positions.push(cursor.value);
            cursor.continue();
          } else {
            // sort by time stamp (useless?)
            positions.sort(function(a, b) { return (a.timestamp - b.timestamp); });
            success(positions);
          }
        };
        request.onerror = function() {
          console.error(request.errorCode);
        }
      });
    },

    addMarker: function(trackId, marker, success, error) {

    },

    updateTrackDetails: function(trackId, success, error) {
      // TODO: 
    },

    close: function() {
      if(db != null) {
        db.close();
        db = null;
      }
    }
  };

  return public;
};