/**
 * videojs-contrib-media-sources
 *
 * Copyright (c) 2015 Brightcove
 * All rights reserved.
 *
 * Handles communication between the browser-world and the mux.js
 * transmuxer running inside of a webworker by exposing a simple
 * message-based interface to a Transmuxer object.
 */
var muxjs = {};

importScripts('../node_modules/mux.js/lib/exp-golomb.js');
importScripts('../node_modules/mux.js/lib/mp4-generator.js');
importScripts('../node_modules/mux.js/lib/stream.js');
importScripts('../node_modules/mux.js/lib/metadata-stream.js');
importScripts('../node_modules/mux.js/lib/transmuxer.js');
importScripts('../node_modules/mux.js/lib/caption-stream.js');

var transmuxer = new muxjs.mp2t.Transmuxer();

onmessage = function(event) {
  if (event.data.action === 'push') {
    // Cast to type
    var segment = new Uint8Array(event.data.data);

    transmuxer.push(segment);
  } else if (event.data.action === 'flush') {
    transmuxer.flush();
  }
};

transmuxer.on('data', function (segment) {
  // transfer ownership of the underlying ArrayBuffer instead of doing a copy to save memory
  // ArrayBuffers are transferable but generic TypedArrays are not
  // see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Passing_data_by_transferring_ownership_(transferable_objects)
  segment.data = segment.data.buffer;
  postMessage({
    action: 'data',
    segment: segment
  }, [segment.data]);
});

if (transmuxer.captionStream) {
  transmuxer.captionStream.on('data', function(caption) {
    postMessage({
      action: 'caption',
      data: caption
    });
  });
}

transmuxer.on('done', function (data) {
  postMessage({ action: 'done' });
});