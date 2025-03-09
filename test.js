console.log("balls");
// Debugging
const util = require('util');


var validUrl = require("valid-url");
var CalendarFetcher = require("./calendarfetcher.js");

var url = "https://calendar.google.com/calendar/ical/1rlrrip9819dk3gbngs2mivl48%40group.calendar.google.com/public/basic.ics";
var auth = null;
var fetchInterval = 300000;
var maximumNumberOfDays = 365;
var previousDaysOfEvents = 1;
debugger;
fetcher = new CalendarFetcher(url, auth, fetchInterval, maximumNumberOfDays, previousDaysOfEvents);
fetcher.onReceive(function(fetcher) {
  console.log("WEEKLY_EVENTS");
  console.log(fetcher.url());
  debugger;
  console.log(fetcher.events());
});

fetcher.startFetch();

console.log(fetcher);
