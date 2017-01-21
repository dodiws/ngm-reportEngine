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
		// region/country id
    adminRpcode: {
			type: 'string',
			required: true
    },
    adminRname: {
			type: 'string',
			required: true
    },
    admin0pcode: {
			type: 'string',
			required: true
    },
    admin0name: {
			type: 'string',
			required: true
    },
		organization_id: {
			type: 'string',
			required: true
		},
		organization: {
			type: 'string',
			required: true
		},
		cluster_id: {
			type: 'string',
			required: true
		},
		cluster: {
			type: 'string',
			required: true
		},
		// add reference to Target beneficiaries
		target_beneficiaries: {
      collection: 'targetbeneficiaries',
      via: 'project_id'
		},	
    // add reference to Target Locations
    target_locations: {
      collection: 'targetlocation',
      via: 'project_id'
    },
		// add reference to Budget Progress
		project_budget_progress: {
      collection: 'budgetprogress',
      via: 'project_id'
		},
		username: {
			type: 'string',
			required: true
		},
		email: {
			type: 'string',
			required: true
		},
		project_status: {
			type: 'string',
			defaultsTo: 'new'
		},
		project_title: {
			type: 'string',
			required: true
		},
		// 2016
		project_type: {
			type: 'array'
		},
		project_type_other: {
			type: 'string'
		},
		project_description: {
			type: 'string'
		},
		// 2017
		activity_type: {
			type: 'string',
			required: true
		},
		activity_description: {
			type: 'array'//,
			// required: true
		},
		activity_description_other: {
			type: 'string'
		},
		project_code: {
			type: 'string'
		},
		project_donor: {
			type: 'array'
		},
		project_donor_other: {
			type: 'string'
		},
		project_budget: {
			type: 'integer',
			required: true
		},
		project_budget_currency: {
			type: 'string',
			required: true
		},
		project_start_date: {
			type: 'date',
			required: true
		},
		project_end_date: {
			type: 'date',
			required: true
		},
		implementing_partners_checked: {
			type: 'boolean',
			defaultsTo: false
		},
		implementing_partners: {
			type: 'string'
		},
		project_description: {
			type: 'string',
			required: true
		},
		beneficiary_type: {
			type: 'array',
			required: true
		},
		admin1pcode: {
			type: 'array',
			required: true
		},
		admin2pcode: {
			type: 'array',
			required: true
		}
	},

	// add reports to project with project locations
	afterCreate: function( project, next ) {
		
		// for each project target locations
		TargetLocation
			.find()
			.where( { project_id: project.id } )
			.exec( function( err, target_locations ) {

				// return error
				if ( err ) return next( err );

				// generate an array of reports
				var reports = getProjectReports( project, target_locations );

				// create
				Report
					.create( reports )
					.exec( function( err, reports ) {

						// return error
						if ( err ) return next( err );

						// next!
						next();
						
					});

			});
	},

	// add reports to project with project locations
	afterUpdate: function( project, next ) {

		// for each project target locations
		TargetLocation
			.find()
			.where( { project_id: project.id } )
			.exec( function( err, target_locations ) {

				// set all reports_active to false
				Report
					.update( { project_id: project.id }, { report_active: false } )
					.exec( function( err, updated_reports ) {

						// return error
						if ( err ) return next( err );						

						// no reports
						if ( !updated_reports.length ) {
							
							next();

						}	else {
							
							// generate an array of reports
							var reports = getProjectReports( project, target_locations );

							// if no locations, next
							if ( !reports[0].locations.length ) return next();

							// update reports
							updateProjectReports( reports, next );

						}

					});
				

			});
	}

};


// generate an array of reports
function getProjectReports( project, target_locations ) {

	// tools
	var moment = require('moment'),
			_under = require("underscore");
	// variables
	var reports = [],
			// set start date / end date to start and end of respective months
			s_date = moment( project.project_start_date ).startOf( 'month' ),
			e_date = moment( project.project_end_date ).endOf( 'month' );

	// number of reports
	var reports_duration = moment.duration( e_date.diff( s_date ) ).asMonths().toFixed(0);

	// for each report month
	for ( m = 0; m < reports_duration; m++ ) {

		// report is true
		var report_active = true;

		// should be reports just for 2016 period!
		if ( moment( s_date ).add( m, 'M' ).year() < 2016  ) {
			report_active = false;
		}

		// report_status 'todo' open from 1st of next month
		var report_status = moment().diff( moment( s_date ).add( m, 'M' ).endOf( 'month' ) ) >= 0 ? 'todo' : 'pending';

		// create report
		var report = {
			// defaults
			report_status: report_status,
			report_active: report_active,
			report_month: moment( s_date ).add( m, 'M' ).month(),
			report_year: moment( s_date ).add( m, 'M' ).year(),
			reporting_period: moment( s_date ).add( m, 'M' ).set('date', 1).format(),
			reporting_due_date: moment( s_date ).add( m+1, 'M' ).set('date', 15).format(),
			locations: []
		};

		// merge with project
		report = _under.extend( {}, report, project );
		report.project_id = project.id;
		delete report.id;

		// add report locations
		report.locations = getProjectReportLocations( target_locations );

		// add report to reports
		reports.push( report );

	}

	// return the reports for the project period
	return reports;

};

// generate an array of reports
function getProjectReportLocations( target_locations ) {

	// variables
	var locations = [];

	// for project target_locations
	target_locations.forEach( function( target_location, t_index ) {

		// clone target_location
		var l = target_location.toObject();
				delete l.id;

		locations.push( l );
		
	});

	// return locations array
	return locations;

};

// update existing project reports
function updateProjectReports( reports, next ) {

	// number of reports to update
	var counter = 0,
			length = reports.length;

	// for each report
	reports.forEach( function( report, r_index ) {

		// report is true
		var report_active = true;

		// should be reports just for 2016 period and beyond!
		if ( reports[ r_index ].report_year < 2016  ) {
			report_active = false;
		}

		// updateOrCreate (returns array)
		Report
			.update( { 	project_id: reports[ r_index ].project_id,
									report_month: reports[ r_index ].report_month, 
									report_year: reports[ r_index ].report_year
								}, { report_active: report_active } )
			.exec( function( err, report ) {

				// return error
				if ( err ) return next( err );

				// if no report - create
				if ( !report.length ) {

					// create with association
					Report
						.create( reports[ r_index ] )
						.exec( function( err, report ) {

							// return error
							if ( err ) return next( err );

							// counter
							counter++;							

							// final update
							if ( counter === length ) {
								// next!
								next();

							}
							
						});

				} else {

					// get locations
					Location
						.find()
						.where( { report_id: report[0].id } )
						.populateAll()
						.exec( function( err, locations ){

							// return error
							if ( err ) return next( err );

							// for each location
							locations.forEach( function( location, l_index){

								// add beneficiaries if existing
								if ( location.beneficiaries.length ) {
									reports[ r_index ].locations[ l_index ].beneficiaries = location.beneficiaries;
								}
								
							});

							// updates locations association
							Report
								.update( { 	project_id: reports[ r_index ].project_id,
														report_month: reports[ r_index ].report_month, 
														report_year: reports[ r_index ].report_year
													}, { locations: reports[ r_index ].locations } )
								.exec( function( err, report ) {

									// return error
									if ( err ) return next( err );

									// counter
									counter++;							
									
									// final update ?
									if ( counter === length ) {
										
										// next!
										next();
									}

								});

						
						});

				}

			});

	});

}