/**
 * AdminDashboardController
 *
 * @description :: Health Cluster Dashboard
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

// flatten json
function flatten( json ) {
  var array = [];
  for( var i in json ) {
    if ( json.hasOwnProperty( i ) && json[ i ] instanceof Object ){
      array.push( json[ i ] );
    }
  }
  return array;
}

// admin controller
var AdminDashboardController = {

  //
  getClusterAdminIndicator: function( req, res ){

    // request input
    if ( !req.param( 'report_type' ) || !req.param( 'indicator' ) || !req.param( 'cluster_id' ) || !req.param( 'organization_tag' ) || !req.param( 'adminRpcode' )  || !req.param( 'admin0pcode' ) || !req.param( 'start_date' ) || !req.param( 'end_date' ) ) {
      return res.json( 401, { err: 'report_type, indicator, cluster_id, adminRpcode, admin0pcode, start_date, end_date required!' });
    }

    // organizations to exclude totally
    var $nin_organizations = [ 'immap', 'arcs' ];

    // variables
    var params = {
          moment: require( 'moment' ),
          csv: req.param( 'csv' ),
          list: req.param( 'list' ),
          indicator: req.param( 'indicator' ),
          report_type: req.param( 'report_type' ),
          organization_tag: req.param( 'organization_tag' ),
          cluster_filter: req.param( 'cluster_id' ) === 'all' || req.param( 'cluster_id' ) === 'acbar' ? {} : { cluster_id: req.param( 'cluster_id' ) },
          acbar_partners_filter: req.param( 'cluster_id' ) === 'acbar' ? { project_acbar_partner: true } : {},
          organization_filter: req.param( 'organization_tag' ) === 'all' ? { organization_tag: { '!': $nin_organizations } } : { organization_tag: req.param( 'organization_tag' ) },
          adminRpcode_filter: req.param( 'adminRpcode' ) === 'all' ? {} : { adminRpcode: req.param( 'adminRpcode' ).toUpperCase() },
          admin0pcode_filter: req.param( 'admin0pcode' ) === 'all' ? {} : { admin0pcode: req.param( 'admin0pcode' ).toUpperCase() },
          start_date: req.param( 'start_date' ),
          end_date: req.param( 'end_date' )
      }

    // csv export
    var json2csv = require( 'json2csv' ),
        moment = require( 'moment' ),
        fields = [ 'cluster', 'organization', 'username', 'email', 'project_title', 'report_month_format', 'status_title', 'report_link' ],
        fieldNames = [ 'Cluster', 'Organization', 'User', 'Contact', 'Project Title', 'Month', 'Status', 'Link' ];

    // url
    params.url = req.protocol + '://' + req.get('host') + '/desk/';

    // stock/activity
    if ( params.report_type === 'stock' ) {
      AdminDashboardController.getStockIndicator( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res );
    } else {
      AdminDashboardController.getActivityIndicator( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res );
    }

  },

  // stock reports
  getStockIndicator: function( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res ){
    
    // switch on indicator
    switch( params.indicator ) {

      case 'latest':

        // get organizations by project
        StockReport
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .sort( 'updatedAt DESC' )
          .limit(1)
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            
            // return org list
            return res.json( 200, reports[0] );

          });

        break;

      case 'organizations':

          var organizations = [];

          // get organizations by project
          StockReport
            .find()
            .where( params.cluster_filter )
            .where( params.acbar_partners_filter )
            .where( params.adminRpcode_filter )
            .where( params.admin0pcode_filter )
            .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
            .where( params.organization_filter )
            .exec( function( err, projects ){

              // return error
              if (err) return res.negotiate( err );

              // projects 
              projects.forEach(function( d, i ){

                // if not existing
                if( !organizations[d.organization] ) {
                  organizations[ d.organization ] = {};
                  organizations[ d.organization ].organization_tag = d.organization_tag;
                  organizations[ d.organization ].organization = d.organization;
                }

              });

              // flatten
              organizations = flatten( organizations );

              // order
              organizations.sort(function(a, b) {
                return a.organization.localeCompare(b.organization);
              }); 

              // default
              organizations.unshift({
                organization_tag: 'all',
                organization: 'ALL',
              });

              // orgs
              Organizations
                .find()
                .where( { organization_tag: params.organization_tag } )
                .exec( function( err, organization ){

                  // return error
                  if (err) return res.negotiate( err );

                  if ( !projects.length ) {
                    organizations[1] = organization[0];
                  }

                  // get a list of projects for side menu
                  if ( params.list ) {
                    // return org list
                    return res.json( 200, organizations );
                  } else {
                    // return indicator
                    return res.json( 200, { 'value': organizations.length-1 });
                  }

                });

            });

          break;

      case 'reports_total':
        
        // reports total
        StockReport
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_status: [ 'todo', 'complete' ] } )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .where( { report_active: true } )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // reports
              reports.forEach( function( d, i ){

                // check if form has been edited
                Stock
                  .count( { report_id: d.id } )
                  .exec(function( err, b ){
                    
                    // return error
                    if (err) return res.negotiate( err );

                    // add status / icon
                    reports[i].status = '#e57373';
                    reports[i].icon = 'fiber_manual_record';

                    // if benficiaries
                    if ( b ) {
                      // add status
                      reports[i].status = reports[i].report_status === 'complete' ? '#4db6ac' : '#fff176'
                    }

                    // reutrn
                    counter++;
                    if ( counter === length ) {
                      // table
                      return res.json( 200, reports );
                    }

                  });

              });

            } else {

              // return indicator
              return res.json( 200, { 'value': reports.length });
            }

          });

        break;

      case 'reports_due':

        // reports due
        StockReport
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          .where( { report_status: 'todo' } )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // if no reports
              if ( length === 0 ) {
                
                // return empty
                return res.json( 200, [] );

              } else {

                // reports
                reports.forEach( function( d, i ){

                  // check if form has been edited
                  Stock
                    .count( { report_id: d.id } )
                    .exec(function( err, b ){
                      
                      // return error
                      if (err) return res.negotiate( err );

                      // add status
                      reports[i].status = '#e57373'
                      reports[i].icon = 'watch_later';
                      reports[i].status_title = 'Due';
                      reports[i].report_month_format = moment( reports[i].report_month+1, 'MM' ).format('MMMM');
                      reports[i].report_link = params.url + '#/cluster/stocks/report/' + reports[i].organization_id + '/' + reports[i].id;

                      // if benficiaries
                      if ( b ) {
                        // add status
                        reports[i].status = '#fff176'
                        reports[i].status_title = 'Pending';
                      }

                      // reutrn
                      counter++;
                      if ( counter === length ) {

                        // !csv
                        if ( !params.csv ) {
                          // table
                          return res.json( 200, reports );
                        }

                        // csv
                        if ( params.csv ) {
                          // return csv
                          json2csv({ data: reports, fields: fields, fieldNames: fieldNames  }, function( err, csv ) {
                            
                            // error
                            if ( err ) return res.negotiate( err );

                            // success
                            return res.json( 200, { data: csv } );

                          });
                        }

                      }

                    });

                });

              }

            } else {

              // return indicator
              return res.json( 200, { 'value': reports.length });
            }
            

          });  

        break;

      case 'reports_complete':

        // reports complete
        StockReport
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .where( { report_active: true } )
          .where( { report_status: 'complete' } )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // if no reports
              if ( length === 0 ) {
                
                // return empty
                return res.json( 200, [] );

              } else {
              
                // reports
                reports.forEach( function( d, i ){

                  // check if form has been edited
                  Stock
                    .find( { report_id: d.id } )
                    .exec(function( err, b){
                      
                      // return error
                      if (err) return res.negotiate( err );

                      // add status
                      reports[i].status = '#4db6ac'
                      reports[i].icon = 'check_circle';
                      reports[i].status_title = 'Complete';
                      reports[i].report_month_format = moment( reports[i].report_month+1, 'MM' ).format('MMMM');
                      reports[i].report_link = params.url + '#/cluster/stocks/report/' + reports[i].organization_id + '/' + reports[i].id;

                      // if benficiaries
                      if ( !b.length ) {
                        // add status
                        reports[i].status = '#80cbc4';
                        reports[i].icon = 'adjust'
                        reports[i].status_title = 'Empty Submission';
                      }

                      // reutrn
                      counter++;
                      if ( counter === length ) {

                        // !csv
                        if ( !params.csv ) {
                          // table
                          return res.json( 200, reports );
                        }

                        // csv
                        if ( params.csv ) {
                          // return csv
                          json2csv({ data: reports, fields: fields, fieldNames: fieldNames  }, function( err, csv ) {
                            
                            // error
                            if ( err ) return res.negotiate( err );

                            // success
                            return res.json( 200, { data: csv } );

                          });
                        }

                      }

                    });

                });

              }  

            } else {
              
              // return indicator
              return res.json( 200, { 'value': reports.length });
            }

          });  

        break;

      case 'reports_complete_total':

        // reports total
        StockReport
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .where( { report_active: true } )
          .sort('updatedAt DESC')
          .exec( function( err, total_reports ){

            // return error
            if (err) return res.negotiate( err );

            // reports complete
            Report
              .find()
              .where( params.cluster_filter )
              .where( params.acbar_partners_filter )
              .where( params.adminRpcode_filter )
              .where( params.admin0pcode_filter )
              .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
              .where( params.organization_filter )
              .where( { report_active: true } )
              .where( { report_status: 'complete' } )
              .sort('updatedAt DESC')
              .exec( function( err, reports ){

                // return error
                if (err) return res.negotiate( err );

                // return new Project
                return res.json(200, { 'value': reports.length, 'value_total': total_reports.length });                

              });

            });

            break;

    }
  
  },
  
  // monthly reports
  getActivityIndicator: function( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res ){

    // switch on indicator
    switch( params.indicator ) {

      case 'latest':

        // get organizations by project
        Report
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { project_start_date: { '<=': new Date( params.end_date ) } } )
          .where( { project_end_date: { '>=': new Date( params.start_date ) } } )
          .where( params.organization_filter )
          .sort( 'updatedAt DESC' )
          .limit(1)
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            
            // return org list
            return res.json( 200, reports[0] );

          });

        break;

      case 'organizations':

          var organizations = [];

          // get organizations by project
          Project
            .find()
            .where( params.cluster_filter )
            .where( params.acbar_partners_filter )
            .where( params.adminRpcode_filter )
            .where( params.admin0pcode_filter )
            .where( { project_start_date: { '<=': new Date( params.end_date ) } } )
            .where( { project_end_date: { '>=': new Date( params.start_date ) } } )
            .where( params.organization_filter )
            .exec( function( err, projects ){

              // return error
              if (err) return res.negotiate( err );

              // projects 
              projects.forEach(function( d, i ){

                // if not existing
                if( !organizations[d.organization] ) {
                  organizations[ d.organization ] = {};
                  organizations[ d.organization ].organization_tag = d.organization_tag;
                  organizations[ d.organization ].organization = d.organization;
                }

              });

              // flatten
              organizations = flatten( organizations );

              // order
              organizations.sort(function(a, b) {
                return a.organization.localeCompare(b.organization);
              }); 

              // default
              organizations.unshift({
                organization_tag: 'all',
                organization: 'ALL',
              });

              // orgs
              Organizations
                .find()
                .where( { organization_tag: params.organization_tag } )
                .exec( function( err, organization ){

                  // return error
                  if (err) return res.negotiate( err );

                  if ( !projects.length ) {
                    organizations[1] = organization[0];
                  }

                  // get a list of projects for side menu
                  if ( params.list ) {
                    // return org list
                    return res.json( 200, organizations );
                  } else {
                    // return indicator
                    return res.json( 200, { 'value': organizations.length-1 });
                  }

                });

            });

          break;

      case 'reports_total':
        
        // reports total
        Report
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          .where( { report_status: [ 'todo', 'complete' ] } )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
          .where( params.organization_filter )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // reports
              reports.forEach( function( d, i ){

                // check if form has been edited
                Beneficiaries
                  .count( { report_id: d.id } )
                  .exec(function( err, b ){
                    
                    // return error
                    if (err) return res.negotiate( err );

                    // add status / icon
                    reports[i].status = '#e57373';
                    reports[i].icon = 'fiber_manual_record';

                    // if benficiaries
                    if ( b ) {
                      // add status
                      reports[i].status = reports[i].report_status === 'complete' ? '#4db6ac' : '#fff176'
                    }

                    // reutrn
                    counter++;
                    if ( counter === length ) {
                      // table
                      return res.json( 200, reports );
                    }

                  });

              });

            } else {

              // return indicator
              return res.json( 200, { 'value': reports.length });
            }

          });

        break;
      
      case 'reports_due':

        // reports due
        Report
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          .where( { report_status: 'todo' } )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
          .where( params.organization_filter )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // if no reports
              if ( length === 0 ) {
                
                // return empty
                return res.json( 200, [] );

              } else {

                // reports
                reports.forEach( function( d, i ){

                  // check if form has been edited
                  Beneficiaries
                    .count( { report_id: d.id } )
                    .exec(function( err, b){
                      
                      // return error
                      if (err) return res.negotiate( err );

                      // add status
                      reports[i].status = '#e57373'
                      reports[i].status_title = 'Due';
                      reports[i].icon = 'watch_later';
                      reports[i].report_month_format = moment( reports[i].report_month+1, 'MM' ).format('MMMM');
                      reports[i].report_link = params.url + '#/cluster/projects/report/' + reports[i].project_id + '/' + reports[i].id;

                      // if benficiaries
                      if ( b ) {
                        // add status
                        reports[i].status = '#fff176';
                        reports[i].status_title = 'Pending';
                      }

                      // reutrn
                      counter++;
                      if ( counter === length ) {

                        // !csv
                        if ( !params.csv ) {
                          // table
                          return res.json( 200, reports );
                        }

                        // csv
                        if ( params.csv ) {
                          
                          // return csv
                          json2csv({ data: reports, fields: fields, fieldNames: fieldNames  }, function( err, csv ) {
                            
                            // error
                            if ( err ) return res.negotiate( err );

                            // success
                            return res.json( 200, { data: csv } );

                          });
                        }

                      }

                    });

                });

              }

            } else {

              // return indicator
              return res.json( 200, { 'value': reports.length });
            }
            

          });  

        break;

      case 'reports_complete':

        // reports complete
        Report
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          .where( { report_status: 'complete' } )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
          .where( params.organization_filter )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // if no reports
              if ( length === 0 ) {
                
                // return empty
                return res.json( 200, [] );

              } else {
              
                // reports
                reports.forEach( function( d, i ){

                  // check if form has been edited
                  Beneficiaries
                    .find( { report_id: d.id } )
                    .exec(function( err, b){
                      
                      // return error
                      if (err) return res.negotiate( err );

                      // add status
                      reports[i].status = '#4db6ac'
                      reports[i].status_title = 'Complete';
                      reports[i].icon = 'check_circle';
                      reports[i].report_month_format = moment( reports[i].report_month+1, 'MM' ).format('MMMM');
                      reports[i].report_link = params.url + '#/cluster/projects/report/' + reports[i].project_id + '/' + reports[i].id;

                      // if benficiaries
                      if ( !b.length ) {
                        // add status
                        reports[i].status = '#80cbc4';
                        reports[i].icon = 'adjust';
                        reports[i].status_title = 'Empty Submission';
                      }

                      // reutrn
                      counter++;
                      if ( counter === length ) {

                        // !csv
                        if ( !params.csv ) {
                          // table
                          return res.json( 200, reports );
                        }

                        // csv
                        if ( params.csv ) {
                          
                          // return csv
                          json2csv({ data: reports, fields: fields, fieldNames: fieldNames  }, function( err, csv ) {
                            
                            // error
                            if ( err ) return res.negotiate( err );

                            // success
                            return res.json( 200, { data: csv } );

                          });
                        }

                      }

                    });

                });

              }  

            } else {
              
              // return indicator
              return res.json( 200, { 'value': reports.length });
            }

          });  

        break;

      case 'reports_complete_total':

        // reports total
        Report
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
          .where( params.organization_filter )
          .sort('updatedAt DESC')
          .exec( function( err, total_reports ){

            // return error
            if (err) return res.negotiate( err );

            // reports complete
            Report
              .find()
              .where( params.cluster_filter )
              .where( params.acbar_partners_filter )
              .where( params.adminRpcode_filter )
              .where( params.admin0pcode_filter )
              .where( { report_active: true } )
              .where( { report_status: 'complete' } )
              .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
              .where( params.organization_filter )
              .sort('updatedAt DESC')
              .exec( function( err, reports ){

                // return error
                if (err) return res.negotiate( err );

                // return new Project
                return res.json(200, { 'value': reports.length, 'value_total': total_reports.length });                

              });

            });

            break;

    }

  }

};

module.exports = AdminDashboardController;
