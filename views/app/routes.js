angular.module('nlpAnnotationViewerApp').config(function($routeProvider) {

	// Based on the URL passed to the server determine which view to show.

	$routeProvider

	// Show the CAS browser view.
	.when('/nlpannotationviewer', {
		templateUrl: 'app/nlp-annotationviewer/index.html',
		controller: 'NLPAnnotationViewerController'
	})

	// Show the CAS browser view.
	.when('/', {
		redirectTo: '/nlpannotationviewer'
	})

	// Otherwise default to the annotation viewer.
	.otherwise( { redirectTo: '/nlpannotationviewer' } )

	;

});