$(document).ready(function () {
  $('[data-toggle=offcanvas]').click(function () {
    $('.row-offcanvas').toggleClass('active')
  });
});

App = Ember.Application.create({
  //LOG_ACTIVE_GENERATION: true,
  LOG_MODULE_RESOLVER: true,
  LOG_TRANSITIONS: true,
  //LOG_TRANSITIONS_INTERNAL: true, // Ember 1.3.0 [BUGFIX] Make flag LOG_TRANSITIONS_INTERNAL work again
  LOG_VIEW_LOOKUPS: true,
  /*
  LOG_ACTIVE_GENERATION: true,

  // Basic logging, e.g. "Transitioned into 'post'"
  LOG_TRANSITIONS: true, 

  // Extremely detailed logging, highlighting every internal
  // step made while transitioning into a route, including
  // `beforeModel`, `model`, and `afterModel` hooks, and
  // information about redirects and aborted transitions
  LOG_TRANSITIONS_INTERNAL: true,

  //LOG_VIEW_LOOKUPS: true,
  //LOG_BINDINGS: true,
  */
});


App.ApplicationAdapter = DropboxDataStoreAdapter("3pjra0nxwgejhqm", App);

// Prevent accidental leaving the page
window.onbeforeunload = function() {
  return "Are you sure you want to navigate away?";
}

var showdown = new Showdown.converter();
Ember.Handlebars.helper('format-markdown', function(input) {
  return new Handlebars.SafeString(showdown.makeHtml(input));
});

var onFailed = function (reason, model) {
  console.log('>> updating ', model, '\n>> failed because', reason);
  model.rollback();
}
