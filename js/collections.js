/* global wpApiSettings:false */
(function( wp, wpApiSettings, Backbone, _, window, undefined ) {

	'use strict';

	/**
	 * Contains basic collection functionality such as pagination.
	 */
	wp.api.WPApiBaseCollection = Backbone.Collection.extend(
		/** @lends BaseCollection.prototype  */
		{

			/**
			 * Setup default state.
			 *
			 * @param {Backbone.Model[]} [models]
			 * @param {object} [options]
			 * @param {object} [options.data]
			 */
			initialize: function( models, options ) {
				this.state = {
					data: {},
					currentPage: null,
					totalPages: null,
					totalObjects: null
				};
				if ( _.isUndefined( options ) ) {
					this.parent = '';
				} else {
					this.parent = options.parent;

					// Allow initial data to be specified for a bootstrapped collection.
					_.extend( this.state.data, options.data );
				}

				this._initSortOnChange();
			},

			/**
			 * Overwrite Backbone.Collection.sync to pagination state based on response headers.
			 *
			 * Set nonce header before every Backbone sync.
			 *
			 * @param {string} method.
			 * @param {Backbone.Model} model.
			 * @param {{success}, *} options.
			 * @returns {*}.
			 */
			sync: function( method, model, options ) {
				var beforeSend, success,
					self = this;

				options    = options || {};
				beforeSend = options.beforeSend;

				if ( 'undefined' !== typeof wpApiSettings.nonce ) {
					options.beforeSend = function( xhr ) {
						xhr.setRequestHeader( 'X-WP-Nonce', wpApiSettings.nonce );

						if ( beforeSend ) {
							return beforeSend.apply( self, arguments );
						}
					};
				}

				if ( 'read' === method ) {
					if ( options.data ) {
						self.state.data = _.clone( options.data );

						delete self.state.data.page;
					} else {
						self.state.data = options.data = {};
					}

					if ( 'undefined' === typeof options.data.page ) {
						self.state.currentPage = null;
						self.state.totalPages = null;
						self.state.totalObjects = null;
					} else {
						self.state.currentPage = options.data.page - 1;
					}

					self._initSortOnChange();

					success = options.success;
					options.success = function( data, textStatus, request ) {
						self.state.totalPages = parseInt( request.getResponseHeader( 'x-wp-totalpages' ), 10 );
						self.state.totalObjects = parseInt( request.getResponseHeader( 'x-wp-total' ), 10 );

						if ( null === self.state.currentPage ) {
							self.state.currentPage = 1;
						} else {
							self.state.currentPage++;
						}

						if ( success ) {
							return success.apply( this, arguments );
						}
					};
				}

				return Backbone.sync( method, model, options );
			},

			/**
			 * Initialize re-sort when a model in the collection changes or when a
			 * sync happens, if the collection has an orderBy data.
			 *
			 * @private
			 * @returns {boolean} False if already initialized or if orderBy data not present.
			 */
			_initSortOnChange: function() {
				var collection = this;
				if ( collection._initializedSortOnChange || ! collection.state.data.orderby ) {
					return false;
				}

				if ( ! collection.comparator ) {
					collection.comparator = collection.defaultComparator;
				}
				collection.on( 'sync change', function() {
					collection.sort();
				} );
				collection.sort();

				collection._initializedSortOnChange = true;
				return true;
			},

			/**
			 * Compare two models' properties according to the queried orderby param.
			 *
			 * @param {Backbone.Model} a
			 * @param {Backbone.Model} b
			 * @returns {number}
			 */
			defaultComparator: function( a, b ) {
				var collection = this, aValue, bValue, result;

				if ( ! collection.state.data.orderby ) {
					throw new Error( 'Unable to sort collection without orderby query param provided.' );
				}

				aValue = a.get( collection.state.data.orderby );
				bValue = b.get( collection.state.data.orderby );

				if ( _.isUndefined( aValue ) || _.isUndefined( bValue ) ) {
					throw new Error( 'Model lacks specified orderby field: ' + collection.state.data.orderby );
				}

				if ( aValue.valueOf() === bValue.valueOf() ) {
					result = 0;
				} else {
					result = ( aValue.valueOf() < bValue.valueOf() ? -1 : 1 );
				}
				if ( 'desc' === collection.state.data.order ) {
					result *= -1;
				}
				return result;
			},

			/**
			 * Fetches the next page of objects if a new page exists.
			 *
			 * @param {object} [options]
			 * @param {object} [options.data]
			 * @param {number} [options.data.page]
			 * @returns {*}
			 */
			more: function( options ) {
				options = options || {};
				options.data = options.data || {};

				_.extend( options.data, this.state.data );

				if ( 'undefined' === typeof options.data.page ) {
					if ( ! this.hasMore() ) {
						return false;
					}

					if ( null === this.state.currentPage || this.state.currentPage <= 1 ) {
						options.data.page = 2;
					} else {
						options.data.page = this.state.currentPage + 1;
					}
				}

				return this.fetch( options );
			},

			/**
			 * Returns true if there are more pages of objects available.
			 *
			 * @returns null|boolean.
			 */
			hasMore: function() {
				if ( null === this.state.totalPages ||
					 null === this.state.totalObjects ||
					 null === this.state.currentPage ) {
					return null;
				} else {
					return ( this.state.currentPage < this.state.totalPages );
				}
			}
		}
	);

})( wp, wpApiSettings, Backbone, _, window );
