/* ***************************************************
 *
 * Controllers 
 *
 */

App.ApplicationController = Ember.Controller.extend({
  isEditing: false,
  
  checkedIn: function() {
    return this.get('lastCheckInDateVault') && 
      this.get('lastCheckInDateVault').get('value') === todayDate();
  }.property('lastCheckInDateVault'),

  totalInvestmentsStyle: function() {
    return currencyButtonCssClass(this.get('lastCheckInDay').get('totalInvestments'));
  }.property('lastCheckInDay.totalInvestments'),

  totalAssetsStyle: function() {
    return currencyButtonCssClass(this.get('lastCheckInDay').get('totalAssets'));
  }.property('lastCheckInDay.totalAssets'),

  // availableFundsVault: null,    
  // totalInvestmentsVault: null,  
  lastCheckInDateVault: null,  
  lastCheckInDay: null,      
});

App.DaysController = Ember.ArrayController.extend({
  needs: ['application'],
  // availableFundsVault: Ember.computed.alias('controllers.application.availableFundsVault'),
  // totalInvestmentsVault: Ember.computed.alias('controllers.application.totalInvestmentsVault'),
  // lastCheckInDateVault: Ember.computed.alias('controllers.application.lastCheckInDateVault'),

  sortProperties: ['date'],
  sortAscending: false
});

App.GoalsController = Ember.ArrayController.extend({
  needs: ['application'],
  // availableFundsVault: Ember.computed.alias('controllers.application.availableFundsVault'),
  // totalInvestmentsVault: Ember.computed.alias('controllers.application.totalInvestmentsVault'),
  // lastCheckInDateVault: Ember.computed.alias('controllers.application.lastCheckInDateVault'),
});
