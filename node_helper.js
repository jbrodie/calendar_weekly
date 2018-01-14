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
    var events = [];
    this.fetchers = [];
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

    var fetcher;
    if (typeof self.fetchers[url] === "undefined") {
      console.log("Create new calendar fetcher for url: " + url + " - Interval: " + fetchInterval);
      fetcher = new CalendarFetcher(url, auth, fetchInterval, maximumNumberOfDays, previousDaysOfEvents);
      fetcher.onReceive(function(fetcher) {
        self.sendSocketNotification("WEEKLY_EVENTS", {
          url: fetcher.url(),
          events: fetcher.events()
        });
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
  }
});
