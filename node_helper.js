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
      // console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
      // console.log('node_helper: socketNotificationReceived ' + payload);
      this.createFetcher(payload.url, payload.auth, payload.fetchInterval, payload.maximumNumberOfDays, payload.previousDaysOfEvents);
    }
  },

  /* createFetcher(url, reloadInterval)
   * Creates a fetcher for a new url if it doesn't exist yet.
   * Otherwise it reuses the existing one.
   *
   * attribute url string - URL of the news feed.
   * attribute reloadInterval number - Reload interval in milliseconds.
   */

  createFetcher: function(url, auth, fetchInterval, maximumNumberOfDays, previousDaysOfEvents) {
    console.log('******************** createFetcher ***************************');
    // console.log('fetchInterval:' + fetchInterval);
    // console.log('maximumNumberOfDays: ' + maximumNumberOfDays);
    // console.log('previousDaysOfEvents: ' + previousDaysOfEvents);
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
        // console.log('++++++++++++++');
        // console.log('++++++++++++++');
        // console.log('++++++++++++++');
        // console.log('++++++++++++++');
        // console.log('++++++++++++++');
        console.log('Broadcast events.');
        debugger;
        // console.log(fetcher.events());
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
      //console.log('Use existing news fetcher for url: ' + url);
      fetcher = self.fetchers[url];
      fetcher.broadcastEvents();
    }

    fetcher.startFetch();
  }
});
