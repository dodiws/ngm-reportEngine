/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	// connection
	connection: 'ngmHealthClusterServer',

	// strict schema
	schema: true,

	// attributes
	attributes: {
		workshop: {
			model: 'workshop'
		},
		workshop_id: {
			type: 'string'
		},
		organization: {
			type: 'string'
		},
		name: {
			type: 'string'
		},
		phone: {
			type: 'integer'
		},
		email: {
			type: 'string',
			unique: true
		},
		duty_station: {
			type: 'array'
		},
		taken: {
			type: 'boolean',
			defaultsTo: false
		}
	}

};

