var ical = require('./ical')
  , https = require('https')
  , http = require('http')
  , fs = require('fs')

function fetchUrl(url, opts, cb, redirectCount) {
  redirectCount = redirectCount || 0;
  if (redirectCount > 10) {
    return cb(new Error('Too many redirects'), null);
  }

  var parsed = new URL(url);
  var lib = parsed.protocol === 'https:' ? https : http;

  var headers = Object.assign({}, opts.headers || {});

  if (opts.auth) {
    if (opts.auth.bearer) {
      headers['Authorization'] = 'Bearer ' + opts.auth.bearer;
    } else if (opts.auth.user && opts.auth.pass) {
      headers['Authorization'] = 'Basic ' + Buffer.from(opts.auth.user + ':' + opts.auth.pass).toString('base64');
    }
  }

  var reqOpts = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + (parsed.search || ''),
    headers: headers
  };

  lib.get(reqOpts, function(res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      return fetchUrl(res.headers.location, opts, cb, redirectCount + 1);
    }

    var data = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk) { data += chunk; });
    res.on('end', function() { cb(undefined, ical.parseICS(data)); });
  }).on('error', function(err) {
    cb(err, null);
  });
}

exports.fromURL = function(url, opts, cb) {
  if (!cb)
    return;
  fetchUrl(url, opts, cb);
}

exports.parseFile = function(filename) {
  return ical.parseICS(fs.readFileSync(filename, 'utf8'))
}


var rrule = require('rrule').RRule

ical.objectHandlers['RRULE'] = function(val, params, curr, stack, line){
  curr.rrule = line;
  return curr
}
var originalEnd = ical.objectHandlers['END'];
ical.objectHandlers['END'] = function (val, params, curr, stack) {
	// Recurrence rules are only valid for VEVENT, VTODO, and VJOURNAL.
	// More specifically, we need to filter the VCALENDAR type because we might end up with a defined rrule
	// due to the subtypes.
	if ((val === "VEVENT") || (val === "VTODO") || (val === "VJOURNAL")) {
		if (curr.rrule) {
			var rule = curr.rrule.replace('RRULE:', '');
			if (rule.indexOf('DTSTART') === -1) {

				if (curr.start.length === 8) {
					var comps = /^(\d{4})(\d{2})(\d{2})$/.exec(curr.start);
					if (comps) {
						curr.start = new Date(comps[1], comps[2] - 1, comps[3]);
					}
				}

				rule += ';DTSTART=' + curr.start.toISOString().replace(/[-:]/g, '');
				rule = rule.replace(/\.[0-9]{3}/, '');
			}
			curr.rrule = rrule.fromString(rule);
		}
	}
  return originalEnd.call(this, val, params, curr, stack);
}
