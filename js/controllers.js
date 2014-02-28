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

