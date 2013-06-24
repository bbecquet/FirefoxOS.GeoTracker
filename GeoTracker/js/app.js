
// This uses require.js to structure javascript:
// http://requirejs.org/docs/api.html#define

define(function(require) {
  require('zepto');   // lightweight jQuery-like

  // Installation button
  require('./install-button');

  require('geotracker');
  require('leaflet');
  require('Chart');

  var trackStore = new geoTracker.trackStore();
  var currentTrack = null;
  var tracking = false;
  var fakeMode = false; // set to true to simulate a GPS sending regular positions
  var knownTracks = {};

  var $trackList = $('#trackList');
  $trackList.on('click', '.btn_deleteTrack', function(e){
    if(confirm('Are you sure you want to delete this track?')) {
      console.log('Delete '+this.parentNode.dataset.trackid);
      trackStore.deleteTrack(this.parentNode.dataset.trackid, function() {
        loadTrackList();
      });
    }
  });
  $trackList.on('click', '.btn_trackDetails', function(e){
    currentTrack = knownTracks[this.parentNode.dataset.trackid];
    trackStore.getTrackPositions(currentTrack.id, function(positions) {
      currentTrack.positions = positions;
      showView('v_trackDetails');
    });
  });
  function loadTrackList() {
    trackStore.getTrackList(function(tracks){
      knownTracks = {};
    	$trackList.html('');
      $('#noTrackMsg').hide();
      if(tracks.length == 0) {
        $('#noTrackMsg').show();
      } else {
        var track;
      	for(var i=0;i<tracks.length;i++) {
          track = tracks[i];
        	$trackList.append(createTrackItem(track));
          knownTracks[track.id] = {
            id: track.id,
            title: track.title,
            date: track.date,
            positions: [],
            markers: []
          }
      	}
      }
    });
  };
  function createTrackItem(track) {
    return '<li data-trackid="' + track.id + '">' +
      '<span class="t_title">' + track.title + '</span>' +
      '<span class="t_date">' + formatDate(track.date) + '</span>' +
      '<button class="btn_trackDetails">Details</button>' + 
      '<button class="btn_deleteTrack">Delete</button></li>';
  }
  loadTrackList();

  // -- Custom view sequencing --
  var currentView = 'v_trackList';
  $('.newView').on('click', function(){
    showView($(this).data('view'));
  });
  function showView(viewId, params) {
    $('#' + currentView).hide();
    if(typeof views[currentView].onClose == 'function')
      views[currentView].onClose();
    currentView = viewId;
    $('#'+viewId).show();
    if(typeof views[currentView].onOpen == 'function')
      views[currentView].onOpen();
  }  
  var views = {
    v_trackList: {
      onOpen: loadTrackList
    },
    v_trackDetails:{
      onOpen: function() {
        loadTrackDetails(currentTrack);
      }
    },
    v_map:{
    	onOpen: function() {
        mapTrack(currentTrack);
      }
    },
    v_newTrack:{
      onOpen: function() {
        $('#i_title').val('').focus();
      }
    },
    v_tracking:{
      onOpen: function() {
        resumeTracking(currentTrack);
      }
    },
    marker:{
      onClose: function() {
        $('#m_name').val('');
        $('#m_comment').val('');
      }
    }
  };
  $('#btn_addNewTrack').on('click', function(){
    fakeMode = false;
    createNewTrack();
  });
  $('#btn_addNewTrack_FAKE').on('click', function(){
    fakeMode = true;
    createNewTrack();
  });
  $('#btn_stopTracking').on('click', function() {
    // stop GPS and back to static detail view
    tracker.stop();
    tracking = false;
    showView('v_trackDetails');
  });
  $('#btn_backToTrack').on('click', function() {
    if(tracking)
      showView('v_tracking');
    else
      showView('v_trackDetails')
  });
  $('#btn_addNewMarker').on('click', function() {
    var tp = currentTrack.positions;
    if(tp.length > 0) {
      var lat = tp[tp.length - 1].coords.latitude,
        lng = tp[tp.length - 1].coords.longitude;
      var markerDef = {
        lat: lat,
        lng: lng,
        type: $('#m_type').val(),
        name: $('#m_name').val(),
        comment: $('#m_comment').val()
      };
      currentTrack.markers.push(markerDef);

      trackMarkerLayer.addLayer(buildMarker(markerDef));
    }
    showView('v_tracking');
  });
  if(typeof MozActivity !== 'undefined') {
    $('#btn_takePicture').show().on('click', function() {
      var activity = new MozActivity({
				name: "record",
	      data: {
  	    	type: ["photos"]
    	  }
      });

      activity.onsuccess = function() {
      	var picture = this.result;
      	console.log("A picture has been retrieved");
      };

      activity.onerror = function() {
      	console.log(this.error);
      };
    });
  }

  // Map view

  map = L.map('map', {
    center: [48.9, 2.4],
    zoom:16,
    zoomControl: false,
    attributionControl: false
  });
  L.control.scale({imperial: false}).addTo(map);   // TODO: scale unit depending on locale
  L.control.zoom({position: 'bottomright'}).addTo(map);
  $('body').on('offline', function () {
    console.log('offline !');
  });
  $('body').off('offline', function () {
    console.log('online !');
  });
  L.tileLayer(
    //'http://{s}.tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
    'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var trackPolyline = L.polyline([], {opacity: 0.9}).addTo(map);
  var trackMarkerLayer = L.layerGroup().addTo(map);
  
  function mapTrack(track) {
    map.invalidateSize();
  	if(!tracking) {
  		// load a static track, else it will be updated automatically
	  	var coords = [];
      var tp = track.positions;
	  	for(var i=0, l=tp.length; i<l; i++) {
	  		coords.push([tp[i].coords.latitude, tp[i].coords.longitude]);
	  	}
	  	trackPolyline.setLatLngs(coords);
	  	map.fitBounds(trackPolyline.getBounds());

      trackMarkerLayer.clearLayers();
      var tm = track.markers;
      for(var i=0, l=tm.length; i<l; i++) {
        trackMarkerLayer.addLayer(buildMarker(tm[i]));
      }
	  } 
  }

  function buildMarker(markerDef) {
    var m = L.marker([markerDef.lat, markerDef.lng], {
      icon: L.divIcon({className: 'icon-marker icon-marker-'+markerDef.type})
    });
    m.bindPopup('<b>' + markerDef.name + '</b><p>' + markerDef.comment + '</p>');
    return m;
  }

  var tracker;
  function createNewTrack() {
    var title = $('#i_title').val();
    if(title == null || title == '')
      return;
    currentTrack = {
      title: title,
      date: new Date(),
      positions: [],
      markers: []
    };
    trackPolyline.setLatLngs([]);
    trackStore.addTrack(currentTrack, 
   		function(trackId) {
        currentTrack.id = trackId;
  			tracker = new geoTracker.tracker(fakeMode);
	    	showView('v_tracking');
    	}, function() {
    		console.err('Error creating new track');
    });
  }
  function resumeTracking(track) {
    // if already tracking, simply resume
    // if not, start everything
    if(!tracking) {
    	tracking = true;
    	tracker.start(function(newPos) {
	      console.log('New position!', newPos);
	      trackStore.addPosition(track.id, newPos, function(){
          track.positions.push(newPos);
          updateTrackingSummary();
        });
        $('#t_msg').hide();
	    }, function(err) {
        var msg = (err.code == 1 ? 'Permission denied' : (err.code == 2) ? 'Position unavailable' : 'Timeout :(')
        $('#t_msg').html(msg + ' ('+err.code+')').addClass('error').show();
      });
    }
  };

  function updateTrackingSummary() {
    var tp = currentTrack.positions;
  	if(!tp || tp.length == 0)
  		return; 

  	var lastCoord = tp[tp.length - 1].coords;
    $('#t_latLng').html('('+roundTo(lastCoord.latitude, 5) +
    	' ; ' + roundTo(lastCoord.longitude, 5) + ')');
    if(lastCoord.altitude) {
      $('#t_altitude').html(Math.round(lastCoord.altitude)+'m');
    }
    if(lastCoord.heading) {
      $('#t_heading')
        .css('transform', 'rotate('+Math.round(lastCoord.heading)+'deg)')
        .css('-webkit-transform', 'rotate('+Math.round(lastCoord.heading)+'deg)');
    }

    trackPolyline.addLatLng([lastCoord.latitude, lastCoord.longitude]);
    map.panTo([lastCoord.latitude, lastCoord.longitude]);
  }

  function loadTrackDetails(track) {
    console.log(track);
    var stats = geoTracker.utils.getTrackStats(track);
    // TODO: use a template engine
    $('.t_title', '#v_trackDetails').html(track.title);
    $('.t_startDate', '#v_trackDetails').html(formatDate(track.date));
    $('.t_duration', '#v_trackDetails').html(formatDuration(stats.duration));
    $('.t_distance', '#v_trackDetails').html(Math.round(stats.distance));
    $('.t_avgSpeed', '#v_trackDetails').html(Math.round(stats.distance / stats.duration) * 1000);
    $('.t_minAlt', '#v_trackDetails').html(Math.round(stats.minAltitude));
    $('.t_maxAlt', '#v_trackDetails').html(Math.round(stats.maxAltitude));
    $('.t_nbPoints', '#v_trackDetails').html(track.positions.length);
    $('.t_nbMarkers', '#v_trackDetails').html(track.markers.length);

    var ctx = document.getElementById("t_profileChart").getContext("2d");
    var chartData = {
      labels: stats.chartLabels,
      datasets : [
        {
          fillColor : "rgba(151,187,205,0.5)",
          strokeColor : "rgba(151,187,205,1)",
          pointColor : "rgba(151,187,205,1)",
          pointStrokeColor : "#fff",
          data : stats.chartValues
        }
      ]
    }
    new Chart(ctx).Line(chartData,{
      pointDot: false
    });
  };

  
  function roundTo(number, precision) {
    return parseFloat(number.toFixed(precision));
  }

  function formatDuration(duration) {
    return new Date(duration).toLocaleTimeString();
  }

  function formatDate(d) {
    return d.toLocaleString();
  }
});
