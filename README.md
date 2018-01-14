# Module: Weekly Calendar

![alt text](https://github.com/jbrodie/calendar_weekly/blob/master/weekly_calendar.png)

The 'calendar_weekly' module is for a week by week listing of your calendar events
showing the detail and times of your appointments for the Magic Mirror project
(https://github.com/MichMich/MagicMirror).

This module was a modification to the original work from the 'calendar_monthly'
module by @KirAsh4 located (https://github.com/KirAsh4/calendar_monthly/).  
Most of the framework and the display was based from this module.

The calendar loading was repurposed with some modifications from the 'calendarfetcher.js'
node helper written by Michael Teeuw.

Things to keep in mind with this module.  I have built it based on the 2 week window
on the calendar I wanted to be able to display.  That being said, you can make this
1 - 3 weeks without any serious issues but it must be positioned in the 'lower_third'
position to not conflict with the other modules on the mirror for space.  You can
also make space by changing the height in the rows through the css as well if you
don't need them so tall or want a single week with taller space for appointments.

## Installing the module
Clone this repository in your `~/MagicMirror/modules/` folder `( $ cd ~MagicMirror/modules/ )`:
````javascript
git clone git@github.com:jbrodie/calendar_weekly.git
````

## Using the module
To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
	{
		module: 'calendar_weekly',
		position: 'lower_third',
		config: {
			fetchInterval: 10000,
			weeksToShow: 2,
			calendars: [{
					url: "https://www.calendarlabs.com/ical-calendar/ics/39/Canada_Holidays.ics"
				},
				{
					url: "https://www.calendarlabs.com/ical-calendar/ics/76/US_Holidays.ics"
				}
			]
		}
	},
]
````

## Configuration options
It is recommended that this module be used in the lower third position due to its size.
The `calendar_weekly` module has several optional properties that can be used to change its behaviour:

<table>
	<thead>
		<tr>
			<th>Option</th>
			<th>Description</th>
			<th>Default</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td><code>fetchInterval</code></td>
			<td>How often to refresh and pull calendar data in milliseconds.</td>
			<td>300000</td>
		</tr>
		<tr>
			<td><code>weeksToShow</code></td>
			<td>How many weeks to display on the calendar.  Should be between 1 and 3, if you want to show more then you will have to make CSS changes for the height of each row.</td>
			<td>2</td>
		</tr>
		<tr>
			<td><code>calendars</code></td>
			<td>Array or URLs to the calendars you wish to show.</td>
			<td>300000 (5 minutes)</td>
		</tr>
	</tbody>
</table>

## Custom CSS Styling
The `calendar_weekly` module creates a table that contains the various elements of the calendar. Most of
the relevant elements are tagges with either a <code>class</code> or <code>id</code> making it possible
for anyone to make changes to the default styling.

The full element tree is as follows:
````javascript
<table id="calendar-table">
  <thead>
    <tr>
	  <th id="calendar-th">
	    <span id="monthName">[month name]</span>
		<span id="yearDigits">[4 digit year]</span>
	  </th>
	</tr>
  </thead>

  <tfoot>
    <tr id="calender-tf">
	  <td class="footer"> </td>
	</tr>
  </tfoot>

  <tbody>
    <tr id="calendar-header">
	  <td class="calendar-header-day">[day name]</td>
	  /* Repeat above line 7 times for each day of the week, Sun/Mon/Tue/etc. */
	  /* ... */
	</tr>
	<tr class="weekRow">
	  <td class="calendar-day">
	    <div class="square-box">
		  <div class="square-content">
		    <div>
			  <span [class="... read Note #1 below ..."]>[date number]</span>
			</div>
		  </div>
		</div>
	  </td>
	  /* Repeat above block 7 days, once for each day */
	  /* ... */
	 </tr>
	 /* Repeat above block as many times as there are weeks in the month */
	 /* ... */
  </tbody>
</table>
````

Note #1:
If the date being displayed is:
- from the previous month, the *class* name will be <code>monthPrev</code>
- from the next month, the *class* name will be <code>monthNext</code>
- the current day, the *class* name will be <code>today</code>
- any other day of the month, the *class* name will be <code>daily</code>

To create your own styling, navigate to the `modules/calendar_weekly/` folder and open the file called
<code>styleCustom.css</code>. Take a look at the various elements already defined and start
playing with them.

**Hint:** It's useful to set your <code>cssStyle</code> to <code>custom</code> and see what that
looks like before you start making changes. This will serve as a reference when you're looking at
the CSS file.
