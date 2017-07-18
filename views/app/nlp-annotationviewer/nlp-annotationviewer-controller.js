angular.module('nlpAnnotationviewerController', [])
.controller('NLPAnnotationViewerController', ['$scope', '$http', '$uibModal', '$location', 'AnnotationService',
function ($scope, $http, $uibModal, $location, AnnotationService) {

	var textConTypeReqHeaders = {
			headers: { 'Content-Type': 'text/plain' }
	}

	debugLevel = 21;
	$scope.annotationStates;
	$scope.annotator_options = [];
	$scope.annotators_selected = [];

	// Make annotation viewer properties available in our scope.
	// Its directives will expect to find certain variables in $scope.avp.<variable-name>
	// Variable 'avp' stands for 'Annotation Viewer Properties'.
	$scope.avp = AnnotationService.getProperties();

    $scope.avp.setDebugLevel(debugLevel);

	var mylog = function(priority, message) {
    	var time = Date.now() / 1000 | 0;
        if(priority <= debugLevel){
        	console.log(time+" ("+debugLevel+") : "+message);
        }
	}

	$scope.initializeAnnotatorList = function() {
    	$http.get('./api/analytics')
    	.success(function(data) {
    		var annos = [];
    		for(var anno in data.annotatorList) {
    			annos[annos.length] = data.annotatorList[anno];
    			$scope.annotator_options[annos.length] = {id: annos.length, label: annos[annos.length - 1]};
    		}
    	})
	    .error(function(data, status) {
			var code = status;
		});

	}

	$scope.initializeAnnotatorList();

	$scope.preProcessAnnotationStates = function() {
		//Get the state of the viewed annotations before calling parseJson as it clears those states. make sure not the first time.
		$scope.annotationStates = [];
		var annoStateCnt = 0;
		if(typeof $scope.avp.getTypeGroups() != 'undefined') {
    		for(var i = 0; i < $scope.avp.getTypeGroups().length; i++) {
    		    var thisGroup = $scope.avp.getTypeGroups()[i];
				for(var j = 0; j < thisGroup.types.length; j++) {
				    var thisType = thisGroup.types[j];
			    	if(thisType.colorme)
			    		$scope.annotationStates[annoStateCnt++] = thisType.name;
				}
    		}
		}
	}
	$scope.postProcessAnnotationStates = function() {
		if(0 == $scope.annotationStates.length) {
			$scope.avp.selectAll = true;
			$scope.avp.toggleAll($scope.avp.selectAll);
		}
		else {
			//Not first time, if annotation was previously set reset it
			for(var i = 0; i < $scope.avp.getTypeGroups().length; i++) {
				var thisGroup = $scope.avp.getTypeGroups()[i];
				for(var j = 0; j < thisGroup.types.length; j++) {
					var thisType = thisGroup.types[j];
					if(-1 != $scope.annotationStates.indexOf(thisType.name))
						thisType.colorme = true;
				}
			}
		}
	}

  	$scope.processFile1 = function() {
  		mylog(20,"in processFile1()");

  		var requestCnt = $scope.annotators_selected.length;
  		if(0 < requestCnt) {
			// Open fancy 'processing' avatar
			var watsonAvatar = $uibModal.open({
			      templateUrl: 'watsonAvatar.html',
			      size: 'sm'
			    });
  		}

  		var text = $scope.$parent.inputText;

  		var annoStates = $scope.preProcessAnnotationStates();
  		var annoStateCnt = 0;
  		var requests = [];
  	  	for(var i = 0; i < $scope.annotators_selected.length; i++) {
  	  		var request;
  	  		request = './api/analytics/' + $scope.annotator_options[$scope.annotators_selected[i].id].label;
	    	$http.post(request, text, textConTypeReqHeaders)
	    	.success(function(data) {
	    		try {
		    		for(grp in data.unstructured[0].data) {
		    			requests[grp] = data.unstructured[0].data[grp];
		    		}
					requestCnt--;
		    		if(0 == requestCnt) {
		    			data.unstructured[0].data = requests;
		    			$scope.avp.parseJson(data);
		    			$scope.postProcessAnnotationStates();
		    			watsonAvatar.dismiss();
		    		}
	    		}
	    		catch(err) {
	    			//If dark feature turned off data will not come back in correct format, stop avatar.
	    			watsonAvatar.dismiss();
	    		}
	    	})
		    .error(function(data, status) {
				var code = status;
				requestCnt--;
				watsonAvatar.dismiss();
			});
  		}
  		return;
	};


  	$scope.processClear = function() {
  		mylog(20,"in processClear()");
  		$scope.avp.clear();
  		$scope.$parent.inputText = '';
  		$scope.annotators_selected = [];
  		return;
	};

}]);
