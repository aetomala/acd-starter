var app = angular.module('nlpAnnotationViewerApp',
		[
		 'ngRoute',
		 'ngAnimate',
		 'ui.bootstrap',
		 'annotationviewerDirectives',
		 'nlpAnnotationviewerController',
		 'nlpAnnotationviewerDirectives',
		 'angularjs-dropdown-multiselect'
		 ],
		 function($rootScopeProvider)
		 {
			$rootScopeProvider.digestTtl(100);
		 }
);

app.factory('AnnotationService', [annotationViewerService]);
