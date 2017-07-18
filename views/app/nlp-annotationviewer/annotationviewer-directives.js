angular.module('annotationviewerDirectives',[]);

angular.module('annotationviewerDirectives').directive('annotationviewerText1', function() {
	  return {
	    templateUrl: 'app/nlp-annotationviewer/annotationviewer-text1.html'
	  };
});

angular.module('annotationviewerDirectives').directive('annotationviewerAnnotation1', function() {
	return {
		templateUrl: 'app/nlp-annotationviewer/annotationviewer-annotation1.html'
	};
});

angular.module('annotationviewerDirectives').directive('annotationviewerAnnotations1', function() {
	return {
		templateUrl: 'app/nlp-annotationviewer/annotationviewer-annotations1.html'
	};
});

angular.module('annotationviewerDirectives').directive('annotationviewerType1', function() {
	return {
		templateUrl: 'app/nlp-annotationviewer/annotationviewer-type1.html'
	};
});

angular.module('annotationviewerDirectives').directive('annotationviewerLegend2', function() {
	return {
		templateUrl: 'app/nlp-annotationviewer/annotationviewer-legend2.html'
	};
});

angular.module('annotationviewerDirectives').directive('annotationviewerLayout2', function() {
	return {
		templateUrl: 'app/nlp-annotationviewer/annotationviewer-layout2.html'
	};
});
