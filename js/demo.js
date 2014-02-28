App = Ember.Application.create({});
App.ApplicationAdapter = DropboxDataStoreAdapter("3pjra0nxwgejhqm", App);

/* Model */
App.Day = DS.Model.extend({
  date: DS.attr(),
  a: DS.attr(),

  // dateString is a proxy for safe editing
  dateString: function() {
    return this.get('date');
  }.property('date'),
    
  dateDisplay: function() {
    return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
      moment(this.get('dateString')).format('MMMM D, YYYY') : '';
  }.property('date'),    
});


/* Routes */
App.Router.map(function() {
  this.resource('days', {path: '/days'});
});
App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('days');
  }
});

App.DaysRoute = Ember.Route.extend({
  model: function() {
    return this.get('store').findAll('day');
  },
  actions: {
    addingRecord: function() {

      var today = new Date();
      var day = Ember.Object.extend({
        date: moment(today).format('YYYY-MM-DD'),      
      }).create();
      this.get('controller').set('currentDay', day);

      this.controllerFor("application").set('isAddingRecord', true);
    },    
    
    save: function(obj) {
      var r = {
        date: obj.date, 
        a: obj.a
      }
      var record = this.get('store').createRecord('day', r);
      record.save();

      this.controllerFor("application").toggleProperty('isAddingRecord');     
    },

    editing: function() {
      this.toggleProperty('isEditing');
    }, 

    update: function(model) {
      model.save(); 
    },  

  }  
});

App.DayRecordComponent = Ember.Component.extend({
  actions: {
    editing: function() {
      this.toggleProperty('isEditing');
    }, 
    update: function() {
      console.log('>> update');

      var r = this.get('record');
      this.sendAction('updateAction', r);
      this.toggleProperty('isEditing'); 
    },
  }
});

/* controlelrs */
App.ApplicationController = Ember.Controller.extend({
  isAddingRecord: false,
});

App.DaysController = Ember.ArrayController.extend({
  needs: 'application',
  isAddingRecord: Ember.computed.alias('controllers.application.isAddingRecord'),

  sortProperties: ['date'],
  sortAscending: false
});

var showdown = new Showdown.converter();
Ember.Handlebars.helper('format-markdown', function(input) {
  return new Handlebars.SafeString(showdown.makeHtml(input));
});