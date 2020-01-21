/* Magic Mirror Module: Calendar Weekly
 *
 * By Jay Brodie <jason.d.brodie@gmail.com>
 * MIT Licensed.
 */

Module.register("calendar_weekly", {

  // Module defaults
  defaults: {
    debugging: false,
    fadeSpeed: 2, // How fast (in seconds) to fade out and in during a refresh
    showHeader: true, // Show the month and year at the top of the calendar
    cssStyle: "block", // which CSS style to use, 'clear', 'block', 'slate', or 'custom'
    updateDelay: 5, // How many seconds after midnight before a refresh
    // This is to prevent collision with other modules refreshing
    // at the same time.
    weeksToShow: 2,
    previousDaysOfEvents: 7, // This can not be changed as we need to pull the possible
    // entire week previous.
  },

  // Required styles
  getStyles: function() {
    return [this.data.path + "/css/mcal.css", this.getThemeCss()];
  },

  getThemeCss: function() {
    return this.data.path + "/css/themes/" + this.config.cssStyle + ".css";
  },

  // Required scripts
  getScripts: function() {
    return ["moment.js"];
  },

  // Override start method
  start: function() {
    Log.log("Starting module: " + this.name);
    Log.log("-----------------------------------------------------------------------------------------");
    // Set locale
    moment.locale(config.language);
    // Calculate next midnight and add updateDelay
    var now = moment();
    this.midnight = moment([now.year(), now.month(), now.date() + 1]).add(this.config.updateDelay, "seconds");
    this.EventsList = [];
    Log.log("Starting module: " + this.name);

    for (var c in this.config.calendars) {
      var calendar = this.config.calendars[c];
      calendar.url = calendar.url.replace("webcal://", "http://");
      var calendarConfig = {

      };
      // var calendarConfig = {
      //   maximumNumberOfDays: this.config.weeksToShow * 7,
      //   previousDaysOfEvents: this.config.previousDaysOfEvents,
      // };
      // we check user and password here for backwards compatibility with old configs
      if (calendar.user && calendar.pass) {
        Log.warn("Deprecation warning: Please update your calendar authentication configuration.");
        Log.warn("https://github.com/MichMich/MagicMirror/tree/v2.1.2/modules/default/calendar#calendar-authentication-options");
        calendar.auth = {
          user: calendar.user,
          pass: calendar.pass
        }
      }
      this.addCalendar(calendar.url, calendar.auth, calendarConfig);
    }

    this.calendarData = {};
    this.loaded = false;
    this.reloadDom();
  },

  addCalendar: function(url, auth, calendarConfig) {
    this.sendSocketNotification("ADD_CALENDAR_WEEKLY", {
      url: url,
      auth: auth,
      // fetchInterval: calendarConfig.fetchInterval || this.config.fetchInterval,
      // maximumNumberOfDays: calendarConfig.maximumNumberOfDays || this.config.maximumNumberOfDays,
      // previousDaysOfEvents: calendarConfig.previousDaysOfEvents || this.config.previousDaysOfEvents,
      reloadInterval: calendarConfig.reloadInterval || this.config.reloadInterval,
      excludedEvents: calendarConfig.excludedEvents || this.config.excludedEvents,
      maximumEntries: calendarConfig.maximumEntries || this.config.maximumEntries,
      maximumNumberOfDays: calendarConfig.maximumNumberOfDays || this.config.maximumNumberOfDays,
      includePastEvents: calendarConfig.includePastEvents || this.config.includePastEvents,
    });
  },

  create_weeks_table: function() {
    var current_date = moment();
    var month = current_date.month();
    var year = current_date.year();
    var monthName = current_date.format("MMMM");
    var monthLength = current_date.daysInMonth();
    // Find first day of the month, LOCALE aware
    var startingDay = current_date.date(1).weekday();

    var wrapper = document.createElement("table");
    wrapper.className = 'xsmall';
    wrapper.id = 'calendar-table';

    // Create THEAD section with month name and 4-digit year
    var header = document.createElement("tHead");
    var headerTR = document.createElement("tr");

    // We only fill in the THEAD section if the .showHeader config is set to true
    if (this.config.showHeader) {
      var headerTH = document.createElement("th");
      headerTH.colSpan = "7";
      headerTH.scope = "col";
      headerTH.id = "calendar-th";
      var headerMonthSpan = document.createElement("span");
      headerMonthSpan.id = "monthName";
      headerMonthSpan.innerHTML = monthName;
      var headerYearSpan = document.createElement("span");
      headerYearSpan.id = "yearDigits";
      headerYearSpan.innerHTML = year;
      // Add space between the two elements
      // This can be used later with the :before or :after options in the CSS
      var headerSpace = document.createTextNode(" ");

      headerTH.appendChild(headerMonthSpan);
      headerTH.appendChild(headerSpace);
      headerTH.appendChild(headerYearSpan);
      headerTR.appendChild(headerTH);
    }
    header.appendChild(headerTR);
    wrapper.appendChild(header);

    // Create TBODY section with day names
    var bodyContent = document.createElement("tBody");
    var bodyTR = document.createElement("tr");
    bodyTR.id = "calendar-header";

    for (var i = 0; i <= 6; i++) {
      var bodyTD = document.createElement("td");
      bodyTD.className = "calendar-header-day";
      bodyTD.innerHTML = current_date.weekday(i).format("ddd");
      bodyTR.appendChild(bodyTD);
    }
    bodyContent.appendChild(bodyTR);
    wrapper.appendChild(bodyContent);

    // Create TBODY section with the monthly calendar
    var bodyContent = document.createElement("tBody");
    var bodyTR = document.createElement("tr");
    bodyTR.className = "weekRow";

    // Start laying out the week
    var dayOfWeek = moment().startOf('week').subtract(1, 'days');
    var today = moment();
    for (var y = 1; y <= this.config.weeksToShow; y++) {
      var bodyTR = document.createElement("tr");
      bodyTR.className = "weekRow";

      for (var x = 0; x <= 6; x++) {
        dayOfWeek.add(1, 'days');

        var bodyTD = document.createElement("td");
        bodyTD.className = "calendar-day";
        var dayDiv = document.createElement("div");
        dayDiv.className = "square-box";
        var innerSpan = document.createElement("span");
        if (dayOfWeek.date() == today.date()) {
          innerSpan.className = "today";
        } else {
          if (dayOfWeek.month() == today.month()) {
            innerSpan.className = "current-month-day-span";
          } else {
            innerSpan.className = "previous-next-month-day-span";
          }
        }
        innerSpan.innerHTML = dayOfWeek.date();
        dayDiv.appendChild(innerSpan);
        var events = this.days_events(dayOfWeek.date(), dayOfWeek.month());
        for (var i = 0; i < events[0].length; i++) {
          var fullDayEventSpan = document.createElement("span");
          fullDayEventSpan.className = "full-day-event";
          fullDayEventSpan.innerHTML = events[0][i].title;
          dayDiv.appendChild(fullDayEventSpan);
        }
        for (var i = 0; i < events[1].length; i++) {
          var eventSpan = document.createElement("span");
          eventSpan.className = "day-event";
          eventSpan.innerHTML = moment(parseInt(events[1][i].startDate)).format("h:mm A") + ": " + events[1][i].title;
          dayDiv.appendChild(eventSpan);
        }
        bodyTD.appendChild(dayDiv);
        bodyTR.appendChild(bodyTD);
      }
      bodyContent.appendChild(bodyTR);
    }

    bodyContent.appendChild(bodyTR);
    wrapper.appendChild(bodyContent);
    console.dir(this.EventsList);

    return wrapper;
  },

  // Override dom generator
  getDom: function() {
    var wrapper = document.createElement("div");
    // for (var i = -1; i < 2; i++) {
    var child = this.create_weeks_table();
    wrapper.appendChild(child);
    // }
    this.loaded = true;
    return wrapper;
  },

  // Override socket notification handler.
  socketNotificationReceived: function(notification, payload, sender) {
    // debugger;
    this.EventsList = [];
    payload = payload['events'];
    if (notification === "WEEKLY_EVENTS") {
      if (typeof payload !== 'undefined' && payload !== null) {
        for (var i = 0; i < payload.length; i++) {
          var dublicate = false;
          for (var j = 0; j < this.EventsList.length; j++) {
            if (this.EventsList[j].title === payload[i].title && this.EventsList[j].startDate === payload[i].startDate) {
              this.EventsList[j] = payload[i];
              dublicate = true;
            }
          }
          if (!dublicate) {
            this.EventsList.push(payload[i]);
          }
          var start_date = parseInt(payload[i].startDate);
          var event_date = moment(start_date);
          var day = moment(start_date).date();
          var month = moment(start_date).month();
        }
        console.log("Getting events from my-calendar module " + this.EventsList.length);
      }
    } else {
      console.log("Calendar received an unknown socket notification: " + notification);
    }
    if (this.loaded) {
      this.updateDom(this.config.fadeSpeed * 1000);
    }
  },

  // Returns an 2 position array
  // 0 - Full Day Events
  // 1 - Other Events
  days_events: function(today, month) {
    var events = [
      [],
      []
    ];
    for (var i = 0; i < this.EventsList.length; i++) {
      var start_date = parseInt(this.EventsList[i].startDate);
      // debugger;
      if (today === moment(start_date).date() && month === moment(start_date).month()) {
        if (this.EventsList[i].fullDayEvent === true) {
          events[0].push(this.EventsList[i]);
        } else {
          events[1].push(this.EventsList[i]);
        }
      }
    }
    events[0].sort(function(a, b) {
      return (a.title > b.title) ? 1 : ((b.title > a.title) ? -1 : 0);
    });
    events[1].sort(function(a, b) {
      return (a.startDate > b.startDate) ? 1 : ((b.startDate > a.startDate) ? -1 : 0);
    });
    return events;
  },

  scheduleUpdate: function(delay) {
    if (typeof delay !== "undefined" && delay >= 0) {
      nextReload = delay;
    }

    if (delay > 0) {
      // Calculate the time DIFFERENCE to that next reload!
      nextReload = moment.duration(nextReload.diff(moment(), "milliseconds"));
    }

    var self = this;
    setTimeout(function() {
      self.reloadDom();
    }, nextReload);
  },

  reloadDom: function() {
    var now = moment();
    if (now > this.midnight) {
      this.updateDom(this.config.fadeSpeed * 1000);
      this.midnight = moment([now.year(), now.month(), now.date() + 1]).add(this.config.updateDelay, "seconds");
    }
    var nextRefresh = moment([now.year(), now.month(), now.date(), now.hour() + 1]);
    this.scheduleUpdate(nextRefresh);
  },

});
