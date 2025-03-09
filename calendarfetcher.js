/* Magic Mirror
 * Node Helper: Calendar - CalendarFetcher
 *
 * Orignally By Michael Teeuw http://michaelteeuw.nl
 * Modified for application by Jay Brodie
 * MIT Licensed.
 */

var ical = require("./vendor/ical.js");
var moment = require("moment");

var CalendarFetcher = function(url, auth, reloadInterval, maximumNumberOfDays, previousDaysOfEvents) {
  var self = this;

  var reloadTimer = null;
  var events = [];

  var fetchFailedCallback = function() {};
  var eventsReceivedCallback = function() {};

  /* fetchCalendar()
   * Initiates calendar fetch.
   */
  var fetchCalendar = function() {

    clearTimeout(reloadTimer);
    reloadTimer = null;

    nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
    var opts = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Node.js " + nodeVersion + ") MagicMirror/" + global.version + " (https://github.com/MichMich/MagicMirror/)"
      }
    };

    if (auth) {
      if (auth.method === "bearer") {
        opts.auth = {
          bearer: auth.pass
        }

      } else {
        opts.auth = {
          user: auth.user,
          pass: auth.pass
        };

        if (auth.method === "digest") {
          opts.auth.sendImmediately = false;
        } else {
          opts.auth.sendImmediately = true;
        }
      }
    }

    ical.fromURL(url, opts, function(err, data) {
      if (err) {
        fetchFailedCallback(self, err);
        scheduleTimer();
        return;
      }

      newEvents = [];

      var eventDate = function(event, time) {
        return (event[time].length === 8) ? moment(event[time], "YYYYMMDD") : moment(new Date(event[time]));
      };

      for (var e in data) {
        var event = data[e];
        var now = new Date();
        var previous_days_ago = moment().startOf("day").subtract(previousDaysOfEvents, 'days');
        var today = moment().startOf("day").toDate();
        var future = moment().startOf("day").add(maximumNumberOfDays, "days").subtract(1, "seconds"); // Subtract 1 second so that events that start on the middle of the night will not repeat.

        // FIXME:
        // Ugly fix to solve the facebook birthday issue.
        // Otherwise, the recurring events only show the birthday for next year.
        var isFacebookBirthday = false;
        if (typeof event.uid !== "undefined") {
          if (event.uid.indexOf("@facebook.com") !== -1) {
            isFacebookBirthday = true;
          }
        }

        if (event.type === "VEVENT") {
          var startDate = eventDate(event, "start");
          var endDate;
          if (typeof event.end !== "undefined") {
            endDate = eventDate(event, "end");
          } else {
            if (!isFacebookBirthday) {
              endDate = startDate;
            } else {
              endDate = moment(startDate).add(1, "days");
            }
          }

          // calculate the duration of the event for use with recurring events.
          var duration = parseInt(endDate.format("x")) - parseInt(startDate.format("x"));

          if (event.start.length === 8) {
            startDate = startDate.startOf("day");
          }

          var title = "Event";
          if (event.summary) {
            title = (typeof event.summary.val !== "undefined") ? event.summary.val : event.summary;
          } else if (event.description) {
            title = event.description;
          }

          var location = event.location || false;
          var geo = event.geo || false;
          var description = event.description || false;

          if (typeof event.rrule != "undefined" && !isFacebookBirthday) {
            var rule = event.rrule;
            var dates = rule.between(today, future.toDate(), true);

            for (var d in dates) {
              startDate = moment(new Date(dates[d]));
              endDate = moment(parseInt(startDate.format("x")) + duration, "x");
              if (endDate.format("x") > previous_days_ago.format("x")) {
                  newEvents.push({
                    title: title,
                    startDate: startDate.format("x"),
                    endDate: endDate.format("x"),
                    fullDayEvent: isFullDayEvent(event),
                    class: event.class,
                    firstYear: event.start.getFullYear(),
                    location: location,
                    geo: geo,
                    description: description
                  });
              }
            }
          } else {
            // Single event.
            var fullDayEvent = (isFacebookBirthday) ? true : isFullDayEvent(event);

            // Skip conditions for events
            // Full day event and it has passed the window for previous days ago
            // Not full day and end date has passed window for previous days ago
            // Start Date is past the how many days to gather window, event not in window
            if ((!fullDayEvent && endDate < previous_days_ago.format('x')) ||
                fullDayEvent && endDate <= previous_days_ago.format('x') ||
                startDate > future.format('x') ) {
              continue;
            }

            // Handle multi-day events
            if (startDate.isBefore(endDate, 'day')) {
              var current = startDate.clone();
              while (current.isBefore(endDate, 'day')) {
                newEvents.push({
                  title: title,
                  startDate: current.startOf('day').format("x"),
                  endDate: current.endOf('day').format("x"),
                  fullDayEvent: true,
                  class: event.class,
                  location: location,
                  geo: geo,
                  description: description
                });
                current.add(1, 'day');
              }
            } else {
              // Single-day event
              newEvents.push({
                title: title,
                startDate: startDate.format("x"),
                endDate: endDate.format("x"),
                fullDayEvent: fullDayEvent,
                class: event.class,
                location: location,
                geo: geo,
                description: description
              });
            }
          }
        }
      }

      newEvents.sort(function(a, b) {
        return a.startDate - b.startDate;
      });
      events = newEvents;
      self.broadcastEvents();
      scheduleTimer();
    });
  };

  /* scheduleTimer()
   * Schedule the timer for the next update.
   */
  var scheduleTimer = function() {
    //console.log('Schedule update timer.');
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function() {
      fetchCalendar();
    }, reloadInterval);
  };

  /* isFullDayEvent(event)
   * Checks if an event is a fullday event.
   *
   * argument event obejct - The event object to check.
   *
   * return bool - The event is a fullday event.
   */
  var isFullDayEvent = function(event) {
    if (event.start.length === 8) {
      return true;
    }

    var start = event.start || 0;
    var startDate = new Date(start);
    var end = event.end || 0;

    if (end - start === 24 * 60 * 60 * 1000 && startDate.getHours() === 0 && startDate.getMinutes() === 0) {
      // Is 24 hours, and starts on the middle of the night.
      return true;
    }

    return false;
  };

  /* public methods */

  /* startFetch()
   * Initiate fetchCalendar();
   */
  this.startFetch = function() {
    fetchCalendar();
  };

  /* broadcastItems()
   * Broadcast the existing events.
   */
  this.broadcastEvents = function() {
    console.log('Broadcasting ' + events.length + ' events.');
    eventsReceivedCallback(self);
  };

  /* onReceive(callback)
   * Sets the on success callback
   *
   * argument callback function - The on success callback.
   */
  this.onReceive = function(callback) {
    eventsReceivedCallback = callback;
  };

  /* onError(callback)
   * Sets the on error callback
   *
   * argument callback function - The on error callback.
   */
  this.onError = function(callback) {
    fetchFailedCallback = callback;
  };

  /* url()
   * Returns the url of this fetcher.
   *
   * return string - The url of this fetcher.
   */
  this.url = function() {
    return url;
  };

  /* events()
   * Returns current available events for this fetcher.
   *
   * return array - The current available events for this fetcher.
   */
  this.events = function() {
    return events;
  };

};

module.exports = CalendarFetcher;
