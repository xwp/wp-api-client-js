(function( window, undefined ) {

	'use strict';

	window.wp = window.wp || {};
	wp.api = wp.api || {};
	wp.api.utils = wp.api.utils || {};

	/**
	 * ECMAScript 5 shim, from MDN.
	 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
	 */
	if ( ! Date.prototype.toISOString ) {
		var pad = function( number ) {
			var r = String( number );
			if ( r.length === 1 ) {
				r = '0' + r;
			}

			return r;
		};

		Date.prototype.toISOString = function() {
			return this.getUTCFullYear() +
				'-' + pad( this.getUTCMonth() + 1 ) +
				'-' + pad( this.getUTCDate() ) +
				'T' + pad( this.getUTCHours() ) +
				':' + pad( this.getUTCMinutes() ) +
				':' + pad( this.getUTCSeconds() ) +
				'.' + String( ( this.getUTCMilliseconds() / 1000 ).toFixed( 3 ) ).slice( 2, 5 ) +
				'Z';
		};
	}

	/**
	 * Parse date into ISO8601 format.
	 *
	 * @param {Date} date.
	 */
	wp.api.utils.parseISO8601 = function( date ) {
		var timestamp, struct, i, k,
			minutesOffset = 0,
			numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];

		// ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
		// before falling back to any implementation-specific date parsing, so that’s what we do, even if native
		// implementations could be faster.
		//              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
		if ( ( struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec( date ) ) ) {
			// Avoid NaN timestamps caused by “undefined” values being passed to Date.UTC.
			for ( i = 0; ( k = numericKeys[i] ); ++i ) {
				struct[k] = +struct[k] || 0;
			}

			// Allow undefined days and months.
			struct[2] = ( +struct[2] || 1 ) - 1;
			struct[3] = +struct[3] || 1;

			if ( struct[8] !== 'Z' && struct[9] !== undefined ) {
				minutesOffset = struct[10] * 60 + struct[11];

				if ( struct[9] === '+' ) {
					minutesOffset = 0 - minutesOffset;
				}
			}

			timestamp = Date.UTC( struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7] );
		} else {
			timestamp = Date.parse ? Date.parse( date ) : NaN;
		}

		return timestamp;
	};

	/**
	 * Helper function for getting the root URL.
	 * @return {[type]} [description]
	 */
	wp.api.utils.getRootUrl = function() {
		return window.location.origin ?
			window.location.origin + '/' :
			window.location.protocol + '/' + window.location.host + '/';
	};

	/**
	 * Helper for capitalizing strings.
	 */
	wp.api.utils.capitalize = function( str ) {
		if ( _.isUndefined( str ) ) {
			return str;
		}
		return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
	};

	/**
	 * Extract a route part based on negitive index.
	 *
	 * @param {string} route The endpoint route.
	 * @param {int}    part  The number of parts from the end of the route to retrieve. Default 1.
	 *                       Example route `/a/b/c`: part 1 is `c`, part 2 is `b`, part 3 is `a`.
	 */
	wp.api.utils.extractRoutePart = function( route, part ) {
		part  = part || 1;

		// Remove versions string from route to avoid returning it.
		route = route.replace( wp.api.versionString, '' );
		var routeParts = route.split( '/' ).reverse();
			if ( _.isUndefined( routeParts[ --part ] ) ) {
				return '';
			}
			return routeParts[ part ];
	};

	/**
	 * Extract a parent name from a passed route.
	 *
	 * @param {string} route The route to extract a name from.
	 */
	wp.api.utils.extractParentName = function( route ) {
		var name,
			lastSlash = route.lastIndexOf( '_id>[\\d]+)/' );

		if ( lastSlash < 0 ) {
			return '';
		}
		name = route.substr( 0, lastSlash - 1 );
		name = name.split( '/' );
		name.pop();
		name = name.pop();
		return name;
	};

})( window );
