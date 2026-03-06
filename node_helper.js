/* Magic Mirror
 * Node Helper: Calendar
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var validUrl = require("valid-url");
var CalendarFetcher = require("./calendarfetcher.js");

module.exports = NodeHelper.create({
  // Override start method.
  start: function() {
    this.fetchers = [];
    this.calendarEvents = {};
    this.expectedUrls = [];
    console.log("Starting node helper for: " + this.name);
  },

  // Override socketNotificationReceived method.
  socketNotificationReceived: function(notification, payload) {
    if (notification === "ADD_CALENDAR_WEEKLY") {
      this.createFetcher(payload.url, payload.auth, payload.fetchInterval, payload.maximumNumberOfDays, payload.previousDaysOfEvents);
    }
  },

  /* createFetcher(url, auth, reloadInterval, maximumNumberOfDays, previousDaysOfEvents)
   * Creates a fetcher for a new url if it doesn't exist yet.
   * Otherwise it reuses the existing one.
   *
   * attribute url string - URL of the news feed.
   * attribute auth array - Authentication credentials for the calendar.
   * attribute fetchInterval number - how oftent to reload the calendar data.
   * attribute maximumNumberOfDays number - Maximum days from today to get events for.
   * attribute previousDaysOfEvents number - Number of days previous to today to get events for..
   */

  createFetcher: function(url, auth, fetchInterval, maximumNumberOfDays, previousDaysOfEvents) {
    var self = this;

    if (!validUrl.isUri(url)) {
      self.sendSocketNotification("INCORRECT_URL", {
        url: url
      });
      return;
    }

    if (self.expectedUrls.indexOf(url) === -1) {
      self.expectedUrls.push(url);
    }

    var fetcher;
    if (typeof self.fetchers[url] === "undefined") {
      console.log("Create new calendar fetcher for url: " + url + " - Interval: " + fetchInterval);
      fetcher = new CalendarFetcher(url, auth, fetchInterval, maximumNumberOfDays, previousDaysOfEvents);

      fetcher.onReceive(function(fetcher) {
        self.calendarEvents[fetcher.url()] = fetcher.events();
        if (self.allCalendarsLoaded()) {
          self.broadcastAllEvents();
        }
      });

      fetcher.onError(function(fetcher, error) {
        self.sendSocketNotification("FETCH_ERROR", {
          url: fetcher.url(),
          error: error
        });
      });

      self.fetchers[url] = fetcher;
    } else {
      fetcher = self.fetchers[url];
      fetcher.broadcastEvents();
    }

    fetcher.startFetch();
  },

  allCalendarsLoaded: function() {
    for (var i = 0; i < this.expectedUrls.length; i++) {
      if (typeof this.calendarEvents[this.expectedUrls[i]] === "undefined") {
        return false;
      }
    }
    return true;
  },

  broadcastAllEvents: function() {
    var allEvents = [];
    for (var url in this.calendarEvents) {
      allEvents = allEvents.concat(this.calendarEvents[url]);
    }
    console.log("Broadcasting combined " + allEvents.length + " events from all calendars.");
    this.sendSocketNotification("WEEKLY_EVENTS", {
      events: allEvents
    });
  }
});
