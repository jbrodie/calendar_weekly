/* Magic Mirror Module: Calendar Weekly
 *
 * By Jay Brodie <jason.d.brodie@gmail.com>
 * MIT Licensed.
 */

Module.register("calendar_weekly", {

  // Module defaults
  defaults: {
    debugging: true,
    initialLoadDelay: 0, // How many seconds to wait on a fresh start up.
    // This is to prevent collision with all other modules also
    // loading all at the same time. This only happens once,
    // when the mirror first starts up.
    fadeSpeed: 2, // How fast (in seconds) to fade out and in during a midnight refresh
    showHeader: true, // Show the month and year at the top of the calendar
    cssStyle: "block", // which CSS style to use, 'clear', 'block', 'slate', or 'custom'
    updateDelay: 5, // How many seconds after midnight before a refresh
    // This is to prevent collision with other modules refreshing
    // at the same time.
    weeksToShow: 2,
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
    // Set locale
    moment.locale(config.language);
    // Open socket communication
    this.sendSocketNotification("hello");
    // Calculate next midnight and add updateDelay
    var now = moment();
    this.midnight = moment([now.year(), now.month(), now.date() + 1]).add(this.config.updateDelay, "seconds");
    this.EventsList = [];

    Log.log("8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888");
    Log.log("Starting module: " + this.name);

    // Set locale.
    // moment.updateLocale(config.language, this.getLocaleSpecification(config.timeFormat));

    for (var c in this.config.calendars) {
      var calendar = this.config.calendars[c];
      calendar.url = calendar.url.replace("webcal://", "http://");

      var calendarConfig = {
        maximumNumberOfDays: calendar.maximumNumberOfDays,
        previousDaysOfEvents: calendar.previousDaysOfEvents,
      };

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
    Log.log('++++++++++++++++++++++++++++++ addCaledar in calendar_weekly');
    this.sendSocketNotification("ADD_CALENDAR_WEEKLY", {
      url: url,
      auth: auth,
      fetchInterval: calendarConfig.fetchInterval || this.config.fetchInterval,
      maximumNumberOfDays: calendarConfig.maximumNumberOfDays || this.config.maximumNumberOfDays,
      previousDaysOfEvents: calendarConfig.previousDaysOfEvents || this.config.previousDaysOfEvents,
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

    // Create TFOOT section -- currently used for debugging only
    // var footer = document.createElement('tFoot');
    // var footerTR = document.createElement("tr");
    // footerTR.id = "calendar-tf";
    //
    // var footerTD = document.createElement("td");
    // footerTD.colSpan = "7";
    // footerTD.className = "footer";
    // if (this.config.debugging) {
    //   footerTD.innerHTML = "Calendar currently in DEBUG mode!<br />Please see console log.";
    // } else {
    //   footerTD.innerHTML = "&nbsp;";
    // }
    //
    // footerTR.appendChild(footerTD);
    // footer.appendChild(footerTR);
    // wrapper.appendChild(footer);

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
    // var dayOfWeek = moment('2018-01-01').startOf('week').subtract(1, 'days');
    // var today = moment('2018-01-01');

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
        // var event_type = this.has_event(day, month);
        // if (event_type > 0) {
        //   if (event_type === 1) {
        //     innerSpan.className = "event";
        //   } else if (event_type === 2) {
        //     innerSpan.className = "public_event";
        //   }
        // }

        bodyTD.appendChild(dayDiv);
        bodyTR.appendChild(bodyTD);
      }
      bodyContent.appendChild(bodyTR);
    }
    // -------------------------


    // // Fill in the days
    // var day = 1;
    // var nextMonth = 1;
    // // Loop for amount of weeks (as rows)
    // for (var i = 0; i < 9; i++) {
    //   // Loop for each weekday (as individual cells)
    //   for (var j = 0; j <= 6; j++) {
    //     var bodyTD = document.createElement("td");
    //     bodyTD.className = "calendar-day";
    //     var squareDiv = document.createElement("div");
    //     squareDiv.className = "square-box";
    //     var squareContent = document.createElement("div");
    //     squareContent.className = "square-content";
    //     var squareContentInner = document.createElement("div");
    //     var innerSpan = document.createElement("span");
    //
    //     if (j < startingDay && i == 0) {
    //       // First row, fill in empty slots
    //       innerSpan.className = "monthPrev";
    //       var prev_month_day = prev_month.endOf('month').subtract((startingDay - 1) - j, 'days').date();
    //       innerSpan.innerHTML = prev_month_day;
    //       console.log("DRAGO " + j + " " + prev_month_day + " " + startingDay + " " + current_date);
    //     } else if (day <= monthLength && (i > 0 || j >= startingDay)) {
    //       if (day == moment().date() && shift == 0) {
    //         innerSpan.id = "day" + day;
    //         innerSpan.className = "today";
    //       } else {
    //         innerSpan.id = "day" + day;
    //         innerSpan.className = "daily";
    //         var event_type = this.has_event(day, month);
    //         if (event_type > 0) {
    //           if (event_type === 1) {
    //             innerSpan.className = "event";
    //           } else if (event_type === 2) {
    //             innerSpan.className = "public_event";
    //           }
    //         }
    //       }
    //       innerSpan.innerHTML = day;
    //       day++;
    //     } else if (day > monthLength && i > 0) {
    //       // Last row, fill in empty space
    //       innerSpan.className = "monthNext�";
    //       innerSpan.innerHTML = moment([year, month, monthLength]).add(nextMonth, 'days').date();
    //       nextMonth++;
    //     }
    //     squareContentInner.appendChild(innerSpan);
    //     squareContent.appendChild(squareContentInner);
    //     squareDiv.appendChild(squareContent);
    //     bodyTD.appendChild(squareDiv);
    //     bodyTR.appendChild(bodyTD);
    //   }
    //   // Don't need any more rows if we've run out of days
    //   if (day > monthLength) {
    //     break;
    //   } else {
    //     bodyTR.appendChild(bodyTD);
    //     bodyContent.appendChild(bodyTR);
    //     var bodyTR = document.createElement("tr");
    //     bodyTR.className = "weekRow";
    //   }
    // }

    bodyContent.appendChild(bodyTR);
    wrapper.appendChild(bodyContent);
    console.dir(this.EventsList);

    return wrapper;

    //		}
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
    // console.dir(payload);
    console.log('_________________________________________________________');
    console.log(notification);
    console.log('_________________________________________________________');

    payload = payload['events'];
    if (notification === "WEEKLY_EVENTS") {
      if (typeof payload !== 'undefined' && payload !== null) {
        for (var i = 0; i < payload.length; i++) {
          var dublicate = false;
          for (var j = 0; j < this.EventsList.length; j++) {
            if (this.EventsList[j].title === payload[i].title) {
              this.EventsList[j] = payload[i];
              dublicate = true;
            }
          }
          if (!dublicate) {
            this.EventsList.push(payload[i]);
          }

          var start_date = parseInt(payload[i].startDate);
          //console.log(moment(start_date));
          var event_date = moment(start_date);
          var day = moment(start_date).date();
          var month = moment(start_date).month();
          //console.log(day + " "+ month + " "+ event_date.format("MMMM") + " " + moment().format("MMMM"));
        }
        console.log("Getting events from my-calendar module " + this.EventsList.length);
      }
    } else {
      Log.log("Calendar received an unknown socket notification: " + notification);
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
      // console.log(start_date);
      // console.log(today);
      // console.log(moment(start_date).date());
      if (today === moment(start_date).date() && month === moment(start_date).month()) {
        if (this.EventsList[i].fullDayEvent === true) {
          console.log('Matched FULL DAY an event');
          events[0].push(this.EventsList[i]);
        } else {
          console.log('Matched an event');
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
