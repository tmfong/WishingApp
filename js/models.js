App.Day = DS.Model.extend({
	date: DS.attr(),
	/*
	, year: function() {
        return this.get('date').getFullYear();
	}.property('date')
	, month: function() {
        return this.get('date').getMonth()+1;
	}.property('date')
	, day: function() {
        return this.get('date').getDate();
	}.property('date')
	, daysSince1970: function() {
		return Math.floor(this.get('date').getTime() / (24*60*60*1000));
	}.property('date')		
	*/
	// dateString is a proxy for safe editing
	dateString: function() {
		return this.get('date');
	}.property('date'),
	/*
    dateDisplay: function() {
      return moment(this.get('date')).format('MMMM D, YYYY');
    }.property('date'),	
	dayOfWeek: function() {
		return moment(this.get('date')).format('dddd');
	}.property('date')
	*/
    dateDisplay: function() {
      return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
        moment(this.get('dateString')).format('MMMM D, YYYY') : '';
    }.property('dateString'),
    dayOfWeek: function() {
      return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
        moment(this.get('dateString')).format('dddd') : '';
    }.property('dateString')    	
	, a: DS.attr()
	, b: DS.attr()
	, c: DS.attr()
});

