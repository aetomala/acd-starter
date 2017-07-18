function annotationViewerService() {

	var debugLevel = 9;

    /**
     * AnnotationViewer's log function.
     */
    var mylog = function(priority, message) {
    	if(priority < debugLevel) {
        	var time = Date.now() / 1000 | 0;
    		console.log(time+" ("+debugLevel+") : "+message);
    	}
    };

    /**
     * Json data being processed.
     */
    var jsonData={};

    /**
     * The text portion of the json.
     */
    var theText = "";

    /**
     * Array of all annotations.
     */
    var allAnnotations = [];

    /**
     * All the AnnotationTypes.
     *
     * We construct this dynamically as annotations with new type values are processed.
     */
  	var annotationTypes = [];
  	var presetTypes = [];

  	/**
  	 * The annotationTypes AnnotationType objects arranged hierarchically by group.
  	 */
  	var annotationTypeGroups = [];

    /**
     * An ordered array of TextSpan objects containing all the information necessary for display.
     */
    var spanarray=[];

    /**
     * Variable determine the initial state of Legend checkboxes (true=selected, false=deselected).
     * Use setCheckboxDefault(newValue) to change.
     */
    var checkboxDefault = false;

    /**
     * The next entry to choose from the sample color palette.
     */
    var colorindex = 0;

    /**
     * A palette of sample font/background colors.  Annotation types that aren't pre-assigned
     * a specific combination are given a value from this array.
     */
    var samplecolors = [
                       	{'b':"blue",'c':"white"},
                       	{'b':"yellow",'c':"black"},
                       	{'b':"#FF99FF",'c':"black"},     // light pink
                       	{'b':"lightgreen",'c':"black"},
                       	{'b':"red",'c':"white"},
                       	{'b':"orange",'c':"black"},
                       	{'b':"green",'c':"white"},
                       	{'b':"#99CCFF",'c':"black"}, // light blue
                       	{'b':"#996633",'c':"white"}, // copper / light brown
                       	{'b':"#800000",'c':"white"}, // dark red / rust
                       	{'b':"#001400",'c':"white"}, // dark green
                       	{'b':"salmon",'c':"black"},
                       	{'b':"#9933FF",'c':"white"}, // purple
                       	{'b':"#00FFFF",'c':"black"}, // teal
                       	{'b':"#FFFFB2",'c':"black"}, // light yellow
                       	{'b':"#666633",'c':"white"}, // greenish gold
                       	{'b':"#669999",'c':"white"}, // grayish blue
                       	{'b':"#808000",'c':"white"}  // dark yellow
                       ];

    var ShowPresetTypesOnlyWhenTheyWerePresent = true;

    // This class represents an annotation type.  These are the objects used to create the legend checkboxes.
    var AnnotationType = function(groupName, shortName, type, color, background, colorme) {
    	this.group = groupName;
    	this.name = shortName;
    	this.type = type
    	this.color = color;
    	this.background = background;
    	this.colorme = colorme;
    }

    // This class represents a grouping of annotation types.  In the Watson service container world each grouping is an api/pipeline.
    var AnnotationGroup = function(name) {
    	this.name = name;
    	this.colorme = checkboxDefault;
    	this.types = [];

    }

	// This class represents a span of text characters.
	// It's used first to build a tree that represents the characters of text and which annotations types represent which characters.
	// Then the leaf nodes of that tree are moved into an array.
	var TextSpan = function(children, begin, end, clazz, id) {
		this.children = children;
		this.begin = begin;
		this.end = end;
		this.clazz = clazz.slice(0);
		this.id = id;
	}

	var setPresetTypes = function(types) {

     	mylog(40,"preload annotation types");

      	for(var i=0; i<types.length; i++) {
      		var type = types[i];
         	mylog(80,"  add type : "+type.type);

        	if(typeof type.name === 'undefined') {
        		type.name = type.type.substring(type.type.lastIndexOf('.')+1,type.type.length);
        	}

        	if(typeof type.group === 'undefined') {
        		type.group = "group1";
        	}

        	presetTypes.push(new AnnotationType(type.group, type.name, type.type, type.color, type.background, checkboxDefault));
      	}
	}

    /**
     * Given an array of annotations, make sure the annotationTypes array contains an entry for each
     * new annotation type.
     */
    var addAnnotationTypes = function(groupName, annotationArray) {
      	mylog(40,"in addAnnotationTypes()");

      	// Iterate through all the new annotations.
      	for(var i=0; i<annotationArray.length; i++) {

      		var thisAnnotation = annotationArray[i];
         	mylog(80,"  annotation type : "+thisAnnotation.type);
         	var annotationTypeMissing = true;

         	mylog(80,"  check our "+annotationTypes.length+" types for match");
         	for(var j=0; j<annotationTypes.length; j++) {
       			var atype = annotationTypes[j];

           		if( atype.type == thisAnnotation.type ) {
             		mylog(80,"  match at index ("+i+")");
             		annotationTypeMissing=false;
            		break;
           		}
         	}

         	if(annotationTypeMissing) {
            	mylog(40,"  add a new annotation type : "+thisAnnotation.type);

            	var added = false;

            	if(ShowPresetTypesOnlyWhenTheyWerePresent) {
                	mylog(40,"  copy over preset type : "+thisAnnotation.type);
            		for(var k=0; k<presetTypes.length; k++) {
            			pType = presetTypes[k];
            			if(pType.type === thisAnnotation.type) {
            				added = true;
            				annotationTypes.push(presetTypes[k]);
            				break;
            			}
            		}
            	}

          		if(! added) {
                	mylog(40,"  create a new type object : "+thisAnnotation.type);
          			// Use the shortname of the annotation.  (normally its the java simple class name)
          			var shortname = thisAnnotation.type.substring(thisAnnotation.type.lastIndexOf('.')+1,thisAnnotation.type.length);

            		// Get the color to use (both font and background).
            		var mycolor = getcolor();

            		annotationTypes.push(new AnnotationType(groupName, shortname, thisAnnotation.type, mycolor.c, mycolor.b, checkboxDefault));
          		}
         	}
      	}

	  	return;
    };

    /**
     * This is the core aspect of the AnnotationService function.
     *
     * This method adds annotations (recursively) into a tree of text span nodes.  Each node in the tree
     * does NOT represent a single annotation, instead it represents a snippet of text and all the annotation
     * types that apply to that text.
     *
     * Traversing just the leaf nodes of the tree in order will exactly traverse all the text
     * without any gaps or duplications.  This means angular can display the text as an array of text spans which is
     * independent of checkbox selection.
     *
     * Here is rough psuedo code of how nodes are added:
     *
     *   Input:
     *      parent = An already existing node in the tree
     *      node = An annotation (NOT a node in the tree) that will be added to the tree
     *
     *   Preconditions:
     *      The annotation being added must be totally contained within the parent.
     *         - node.begin >= parent.begin
     *         - node.end <= parent.begin
     *
     *   1.  Sort any child nodes that parent already has.
     *
     *   2.  If the parent doesn't have any children then adding this annotation will create them.
     *          -  unless the new annotation's text span exactly matches the tree node, in that case just update the nodes clazz array.
     *       Else go through the parents children looking for the one we should add the annotation to.
     */
    var addNode = function(parent,newAnn) {
    	mylog(40,"in addNode() "+newAnn.begin+","+newAnn.end+" "+newAnn.type);
      	mylog(60,"parent is : "+parent.begin+","+parent.end+" "+parent.clazz);

      	// sort our children
      	if(parent.children.length!=0) {
      		parent.children.sort(function(a,b){return a.begin-b.begin;});
      	};

		if( (newAnn.begin >= parent.begin) && (newAnn.end <= parent.end) ) {

      		if(parent.children.length==0) {

      			// The parent doesn't have any children yet.
      		    if(newAnn.begin == parent.begin && newAnn.end == parent.end) {

      		    	// If the new node has the exact same span as the parent, then we don't need
      		    	// to add a new node for it, instead just add its type to the parent's clazz array.

      		    	if( ! contains(newAnn.type, parent.clazz) ) {
      		    		parent.clazz.push(newAnn.type);
      		    	}

      		    	mylog(50,"newAnn merged into parent node, clazz is now : "+parent.clazz);
      		    }
      		    else {

      		    	// Add this annotation as the parents first child.  We'll also create any other child nodes necessary
      		    	// so the children nodes represent the same entire text span as the parent.
      	  			mylog(50,"pushed newAnn as first child");

      	  			var childsClazz = parent.clazz.slice(0); // clone the parent clazz array
      		    	if( ! contains(newAnn.type, childsClazz) ) {
          		    	childsClazz.push(newAnn.type);
      		    	}

      	  			if(parent.begin != newAnn.begin) {
      	  				// Create a new child node BEFORE the new annotation's node.
      	  				parent.children.push(new TextSpan([],parent.begin,newAnn.begin,parent.clazz,nextid++));
      	  			}

      	  			// Add the node for the new child.
      	  			parent.children.push(new TextSpan([],newAnn.begin,newAnn.end,childsClazz,nextid++));

      	  			if(newAnn.end != parent.end) {
      	  				// Create a new child node AFTER the new annotation's node.
      					parent.children.push(new TextSpan([],newAnn.end,parent.end,parent.clazz,nextid++));
      				}

      				mylog(60,"now parent looks like");
      				logNode(parent,1);
      			}
      	  		return;
      		}
      		else {

      			// Parent node already has children.

      		    // Go though those children and figure out which child the new annotation should belong to.
      			//
      			// The new annotation's span might match multiple children, in that case we split it into pieces and add it
      			// recursively to each child it shares text with.
      	  		for(var i=0; i<parent.children.length; i++) {

      	    		var thisChild = parent.children[i];
      	    		mylog(60,"consider child : "+thisChild.clazz+" "+thisChild.begin+","+thisChild.end);

      	    		if(newAnn.begin >= thisChild.begin && newAnn.end <= thisChild.end) {

      	    			// The new node is totally contained within this child.
       	      			mylog(40,"add newAnn to this child");
      	      			addNode(thisChild,newAnn);
      	      			return;
       	    		}
       	    		else if(
       	    				(newAnn.begin < thisChild.end && newAnn.end > thisChild.end) ||
       	    				(newAnn.end > thisChild.begin && newAnn.begin < thisChild.begin)
       	    				)
       	    		{

       	    			// A portion, but not all of the new annotation resides within this child.
       	    			mylog(70,"newAnn overlaps this child, newAnn="+newAnn.begin+","+newAnn.end+" child="+thisChild.begin+","+thisChild.end);

       	    			// Note, we know from how we've constructed the tree that this new annotation cannot cover more than 2 children.
       	    			// So this portion is either the beginning of the new annotation or the end, it can't be a middle.

              			var n2 = Object.assign({}, newAnn);

                		if(newAnn.begin < thisChild.begin) {
                  			n2.end = thisChild.begin;
                  			newAnn.begin = thisChild.begin;

                  			mylog(70,"(a) split newAnn into ("+n2.begin+","+n2.end+") and ("+newAnn.begin+","+newAnn.end+")");
                  			addNode(parent,n1);
                  			addNode(parent,newAnn);
                 			return;
                		}
                		else {

                			if(newAnn.end <= thisChild.end) {
               	      			mylog(2,"ERROR - Illegal logic encountered.");
                			}
                  			n2.begin = thisChild.end;
                  			newAnn.end = thisChild.end;

                  			mylog(70,"(b) split newAnn into ("+newAnn.begin+","+newAnn.end+") and ("+n2.begin+","+n2.end+")");
                  			addNode(parent,newAnn);
                  			addNode(parent,n2);
                  			return;
                		}

					}
       	    		else if((newAnn.begin > thisChild.end && newAnn.end <= thisChild.begin) || (newAnn.begin > thisChild.end && newAnn.end <= thisChild.begin)) {
       	      			mylog(2,"ERROR - Something unexpected happened.");
       	      			return;
       	    		} else {
       	    			// the annotation being added doesn't touch this child... so just continue checking children.
       	    		}
          		}

    	     	mylog(2,"ERROR ---------------------------------------------------------- I dont think we should be able to get here..");
        	}
	  	}
	  	else {
	     	mylog(2,"ERROR - newAnn not contained within parent.");
	  	}

		return;
	};


    var buildAnnotationTypeGroups = function(allAnnotationTypesArray) {
      	mylog(40,"in buildAnnotationTypeGroups()");

      	annotationTypeGroups = [];

      	for(var i=0; i<allAnnotationTypesArray.length; i++) {

      		var thisType = allAnnotationTypesArray[i];
      		var theGroup = null;

      		// See if this group already exists
          	for(var k=0; k<annotationTypeGroups.length; k++) {
          		var curGroup = annotationTypeGroups[k];

          		if(curGroup.name == thisType.group) {
          			theGroup = curGroup;
          			break;
          		}
          	}

          	// Create the group if it didn't exist.
          	if(theGroup==null) {
      	      	mylog(45,"  create new type group : "+thisType.group);
      	      	theGroup = new AnnotationGroup(thisType.group);
              	annotationTypeGroups.push(theGroup);
          	}

          	// Add this annotation type to the group.
  	      	mylog(45,"  add type to group : type="+thisType.name+" group="+theGroup.name);
          	theGroup.types.push(thisType);
      	}

    	return;
    };

    /**
     * Build the spanarray displayed by this AnnotationViewer service.
     *
     *   1. Build a tree structure that represents all the annotations
     *     a. create a root node that covers all the text
     *     b. run a for loop that adds all the annotations to that root node.
     *          - see add node method for details
     *   2. Convert that structure into an angular friendly array of span object.
     *
     *   - It's a design requirement that the annotations were ordered by size before this is called.
     */
	var buildDisplayArtifacts = function(annotationArray) {
      	mylog(20,"in buildDisplayArtifacts()");

    	// Each node is assigned a unique id (an incrementing integer starting at 1).
		nextid = 1;

		// Create a type-less root node that covers the entire text.
    	var treeroot = new TextSpan([], 0, theText.length, [], nextid++);

    	// Sort annotations by size.  The addNode logic requires this (it also makes the tree more compact).
      	if(annotationArray.length!=0) {
      		annotationArray.sort(function(a,b){return (b.end-b.begin)-(a.end-a.begin);});
      	};

      	// Now add all annotations to the tree.
      	for(var i=0; i<annotationArray.length; i++) {
       		addNode(treeroot,annotationArray[i]);
	  	}

      	// Convert the tree structure built above into an angular friendly array of spans.  Because of how
      	// we built the tree we only need to use the leaf nodes.
      	var workSpanArray=[];
		createSpanArray(treeroot, workSpanArray);
		spanarray = workSpanArray;

		return;
	};

    /**
     * Create an array that contains (in order) only the leaf nodes of the tree.
	 * This array is what our angular front end displays.
	 */
    var createSpanArray = function(node, theArray) {
		mylog(40,"in createSpanArray(node)");

    	if(typeof node === 'undefined') {
    		mylog(2,"node is undefined");
    		return;
    	}
    	if(node==null) {
    		mylog(2,"node is null");
    		return;
    	}

		// Iterate our tree and put only the leaf nodes in the array.

		if(node.children==null || node.children.length==0) {

	    	// Remove the children item so it doesn't accidently get used anywhere anymore.
	    	delete node.children;

			// add this leaf node to the array.
			theArray.push(node);
		}
		else {
			// otherwise ignore the node, but recurse on its children.
			for(var i=0; i<node.children.length; i++) {
				createSpanArray(node.children[i], theArray);
			}
		}
		return;
    };

    /**
     * Reset all the display data.
     */
    var clearData = function() {

		jsonData={};
	    theText="";
	    allAnnotations=[];
	    annotationTypes=[];
	    annotationTypeGroups=[];
		spanarray=[];
	    colorindex=0;

	    avp.clickindex=-1;
	    avp.hoverindex=-1;
	    avp.selectAll = checkboxDefault;
	};

	/**
	 * See if a particular text object is already in an array.
	 */
    function contains(text, array) {
        for (var i = 0; i < array.length; i++) {
            if (text === array[i]) {
                return true;
            }
        }
        return false;
    }

    var getAnnotations = function() {
    	return allAnnotations;
    };

    var getAnnotationTypesForGroup = function(groupName) {
      	mylog(40,"in getAnnotationTypesForGroup() - "+groupName);
		for(var i = 0; i < annotationTypeGroups.length; i++) {
			if(annotationTypeGroups[i].name == groupName) {
				return annotationTypeGroups[i].types;
			}
		}
		return [];
    };

    var getAnnotationTypeGroups = function() {
    	return annotationTypeGroups;
    };

	var getcolor = function() {
    	if(colorindex >= samplecolors.length) {
        	colorindex=0;
     	}
    	colorindex++;
      	return samplecolors[colorindex-1];
    };

    /**
     * Return any error messages added to the json.
     */
	var getMessages = function() {
		return jsonData.messages;
	};

	var getSpans = function() {
		return spanarray;
	};

	/**
	 * Given an array of annotation types, choose a font color to use for text display.
	 *
	 * This looks at all the annotation types (classes) in the input string and looks to see
	 * if any of them are selected.  If one is, then the color assigned to that annotation for that annotation type is returned.
	 *
	 */
    var getSpanColor = function(clzArray) {
	   	mylog(99,"in getSpanColor()");

	   	for(var i=0; i<clzArray.length; i++) {
			for(var j = 0; j < annotationTypeGroups.length; j++) {
			    var thisGroup = annotationTypeGroups[j];
				for(var k = 0; k < thisGroup.types.length; k++) {
				    var thisType = thisGroup.types[k];
			    	if(clzArray[i] == thisType.type) {
			    		if( thisType.colorme) {
			    			return thisType.color;
			    		}
			    	}
				}
			}
		}

    	return null;
    };

	/**
	 * Given an array of annotation types, choose a background color for text display.
	 */
    var getSpanBackground = function(clzArray) {
	   	mylog(99,"in getSpanBackground()");

	   	for(var i=0; i<clzArray.length; i++) {
			for(var j = 0; j < annotationTypeGroups.length; j++) {
			    var thisGroup = annotationTypeGroups[j];
				for(var k = 0; k < thisGroup.types.length; k++) {
				    var thisType = thisGroup.types[k];
			    	if(clzArray[i] == thisType.type) {
			    		if( thisType.colorme) {
			    			return thisType.background;
			    		}
			    	}
				}
			}
		}

    	return null;
    };

    /**
     * For a given input span, return the text characters it represents.
     */
    var getSpanText = function(spanArrayElement,id){
    	mylog(43,"in getSpanText() id="+id);

    	// Get the html span element for this chunk of text.
        var d = document.getElementById(id);

        if(d==null) {
        	mylog(2,"ERROR - couldn't find element");
        	return;
        }

        var color = getSpanColor(spanArrayElement.clazz);
        var background = getSpanBackground(spanArrayElement.clazz);

        if(color!=null && background != null){
        	// based on the spans' classes we should be able to set its style.
        	d.setAttribute('style',"color:"+color+";background-color:"+background);
        } else {
        	// otherwise remove the style attribute so we inherit whatever our enclosing span had.
        	d.removeAttribute('style');
        }

        var text = theText.substring(spanArrayElement.begin,spanArrayElement.end);
        text = text.replace(/\n/g,'<br>');
        d.innerHTML=text;
    };

	/**
	 * Handle a text span's hover in event.
	 */
    var hoverIn = function(beginindex,ev){
    	mylog(80,"in hoverIn() - "+beginindex);
    	if(avp.clickindex == -1) {
    		avp.hoverindex = beginindex;
    	}
    };

	/**
	 * Handle a text span's hover out event.
	 */
    var hoverOut = function(beginindex,ev){
    	mylog(80,"in hoverOut() ");
    	if(avp.clickindex == -1) {
    		avp.hoverindex = -1;
    	}
    };

    /**
     * Get the font color we should use to display an annotation of the given type.
     */
    var pickAnnotationColor = function(type) {
	   	mylog(40,"in pickAnnotationColor(type) - "+type);
	   	return typesGetWhen(type, "color", "black");
    };

    /**
     * Get the background color we should use to display an annotation of the given type.
     */
    var pickAnnotationBackground = function(type) {
	   	mylog(40,"in pickAnnotationBackground(type) - "+type);
	   	return typesGetWhen(type, "background", "white");
    };

	/**
	* Perform any necessary adjustments to the annotations before we start to working with them.
	*/
	var preprocessAnnotations = function(groupName, annotationArray) {
	    mylog(40,"in preprocessAnnotations()");

	    mylog(55,"before");
	    logAnnotationLocations(annotationArray);  // log before changes

	    for(var i = 0; i < annotationArray.length; i++) {

	    	// Populate missing "type" fields.
		    if(typeof annotationArray[i].type === 'undefined') {
		    	annotationArray[i].type=groupName;
		    }

	    }

	    // Log annotations after pre-processing.
	    mylog(55,"after");
	    logAnnotationLocations(annotationArray);

	    return;
	};

    /**
     * Read in a single array of annotations and build the structures required for display.
     */
    var processAnnotationGroup = function(groupName, rootJson, allAnnots) {
		mylog(40,"in processAnnotationGroup : "+groupName);

    	var theseAnnotations=[];

    	if(typeof rootJson === 'undefined') {
    		mylog(25,"WARNING - supplied json undefined");
    	} else if(typeof rootJson[groupName] === 'undefined') {
    		mylog(25,"WARNING - supplied json does not contain the indicated annotation group :"+groupName);
    	} else if(rootJson[groupName]==null) {
    		mylog(25,"WARNING - supplied json "+groupName+" is null");
    	} else {
    		theseAnnotations = rootJson[groupName];
    	}

    	preprocessAnnotations(groupName, theseAnnotations);
    	allAnnots=allAnnots.concat(theseAnnotations);
    	addAnnotationTypes(groupName, theseAnnotations);

    	return allAnnots;
    }

	var logAnnotationLocations = function(annotationArray) {
		for(var i = 0; i < annotationArray.length; i++) {
			mylog(55,"annotation ("+i+") : type="+annotationArray[i].type+" ("+annotationArray[i].begin+","+annotationArray[i].end+")");
		}
	};

    var logAnnotationTypeGroup = function(group) {
    	mylog(61, "group name = "+group.name);
    	logAnnotationTypeArray(group.types);
    }

    var logAnnotationTypeArray = function(types) {
    	for(var i=0; i<types.length; i++) {
    		logAnnotationType(types[i]);
    	}
    }

    var logAnnotationType = function(type) {
    	var myLevel = 61;
    	mylog(myLevel, "Logging annotation type")
    	mylog(myLevel, "  group="+type.group);
    	mylog(myLevel, "  name="+type.name);
    	mylog(myLevel, "  type="+type.type);
    }

	var logNode = function(node,indent) {
		// dump this node
		mylog(45,"  ("+indent+ ") "+ node.begin +" "+ node.end +" "+ node.clazz);

		// dump all its children
		for(var i=0; i<node.children.length; i++) {
			logNode(node.children[i],indent+1);
		}
	};

    /**
     * Process a json object into the artifacts displayed by the front end.
     *
     * We expect it to be in the common services form.
     */
    var parseJson = function(json) {
		mylog(20,"parseJson");

    	clearData();

    	//--------------------------------------------------------------------------------
    	// Get the json
    	//--------------------------------------------------------------------------------
    	jsonData = json

    	//--------------------------------------------------------------------------------
    	// Get the text.
    	//--------------------------------------------------------------------------------
    	if(typeof jsonData.unstructured[0].text === 'undefined') {
    		mylog(25,"WARNING - unstructured[0].text is not present in the json");
    		return;
    	} else if(jsonData.unstructured[0].text==null) {
    		mylog(25,"WARNING - unstructured[0].text in the json is null");
    		return;
    	} else {
        	theText = jsonData.unstructured[0].text
    	}

    	//--------------------------------------------------------------------------------
    	// Process all the annotations.
    	//--------------------------------------------------------------------------------
      	if( ! ShowPresetTypesOnlyWhenTheyWerePresent) {
      		for(var i=0; i<presetTypes.length; i++) {
      			annotationTypes.push(presetTypes[i]);
      		}
      	}

    	for(grp in jsonData.unstructured[0].data) {
        	allAnnotations = processAnnotationGroup(grp, jsonData.unstructured[0].data, allAnnotations);
    	}

      	//--------------------------------------------------------------------------------
    	// Now build the final objects the UI actually displays.
    	//--------------------------------------------------------------------------------

    	// Build the 'annotation type groups' objects the viewer shows.
    	buildAnnotationTypeGroups(annotationTypes);

    	// Build the array of spans.  This is the core functional logic of the viewer.
    	buildDisplayArtifacts(allAnnotations);

    	return;
    };

    /**
     * Parse json that's in the format used by the older annotation viewer / casbrowser.
     */
    var parseJsonOldFormat = function(json) {
		mylog(20,"parseJsonOldFormat");

    	// Verify json has text.
    	if(typeof json.questionText === 'undefined') {
    		mylog(25,"WARNING - questionText is not present in the json");
    		return;
    	}
    	if(json.questionText==null) {
    		mylog(25,"WARNING - questionText in the json is null");
    		return;
    	}

    	// Verify json has annotations.
      	if(typeof json.annotations === 'undefined'){
        	mylog(2,"WARNING - annotations was undefined in the json");
      		return;
      	} else if(json.annotations == null){
        	mylog(2,"WARNING - annotations was null in the json");
      		return;
      	}

    	// Convert this older casbrowser json format into the service container model.
      	var jsonNew = updateJson(json);

      	parseJson(jsonNew);
    };

	/**
	 * Pass a boolean that indicates whether checkboxes should be initially selected or not.
	 */
	var setCheckboxDefault = function(newDefault) {
		checkboxDefault = newDefault;
	};

    /**
     * Set the 'begin' value of the clicked span.  Users can only click on spans, not individual characters.
     */
    var setClickLocation = function(beginindex,ev){
    	mylog(40,"in setClickLocation() - begin index is : "+beginindex);

    	// If a span was clicked, then this click will just undo that.
    	if(avp.clickindex != -1) {
    		avp.clickindex = -1;
    		return;
    	}

    	avp.hoverindex = -1;

    	// set the beginning of this span as the new clicked index.
    	avp.clickindex=beginindex;
    };

    var setDebugLevel = function(newLevel) {
    	debugLevel = newLevel;
    }

    var toggleAll = function(newValue) {
		mylog(45,"in toggleAll() : "+newValue);
    	typesSetAll("colorme", newValue);
    };

    var toggleGroup = function(groupName, newValue) {
		mylog(45,"in toggleGroup() : group="+groupName+" newValue="+newValue);

		// When the group's name field equals groupName then set its colorme value to newValue.
    	typesSetWhen("group", groupName, "colorme", newValue);
    };


	/**
	 * For all annotation types, set a field to a particular value.
	 *
	 * parm1 - the field to set
	 * parm2 - the value for the field
	 */
	var typesSetAll = function(targetField, newValue) {
	    mylog(40,"in typesSetAll : targetField="+targetField+" newValue="+newValue);

		for(var i = 0; i < annotationTypeGroups.length; i++) {

		    var thisGroup = annotationTypeGroups[i];
		    if(typeof thisGroup[targetField] !== 'undefined') {
				thisGroup[targetField]=newValue;
		    }

			for(var k = 0; k < thisGroup.types.length; k++) {
			    thisGroup.types[k][targetField]=newValue;
			}
		}
	};

	/**
	 * Find the annotation type entry for the specified type.
	 * Return its value for the specified field.
	 * If the type doesn't exist, return the default value.
	 */
	var typesGetWhen = function(type, field, defaultValue) {
	    mylog(40,"in typesGetWhen : type="+type+" field="+field);

		for(var i = 0; i < annotationTypeGroups.length; i++) {
		    var thisGroup = annotationTypeGroups[i];
			for(var k = 0; k < thisGroup.types.length; k++) {
			    var thisType = thisGroup.types[k];
		    	if(thisType.type == type) {
		    		return thisType[field];
		    	}
			}
		}

		return defaultValue;
	};

	/**
	 * Find the annotation type entry for the specified type.
	 * Return its value for the specified field.
	 * If the type doesn't exist, return the default value.
	 */
	var typesSetWhen = function(conditionField, conditionValue, targetField, targetValue) {
	    mylog(40,"in typesSetWhen() ");

		for(var i = 0; i < annotationTypeGroups.length; i++) {
		    var thisGroup = annotationTypeGroups[i];
			for(var k = 0; k < thisGroup.types.length; k++) {
			    var thisType = thisGroup.types[k];
				if(thisType[conditionField] == conditionValue) {
					thisType[targetField]=targetValue;
				}
			}
		}
	};

	/**
	 * Convert an older casbrowser formatted json string into the service container format.
	 */
    var updateJson = function(oldJson) {

    	var newJson = {"unstructured": [{
    			                	      "text": oldJson.questionText,
    			                	      "data": { "group1": oldJson.annotations }
    			                        }]};

    	var annots = newJson.unstructured[0].data.group1;

    	// Now do some annotation specific conversions.
	    for(var k = 0; k < annots.length; k++) {

	    	// convert begin and end from strings to integers.
	    	annots[k].begin=parseInt(annots[k].begin);
	    	annots[k].end=parseInt(annots[k].end);

	    	// populate missing "type" field
		    if(typeof annots[k].type === 'undefined') {
			    if(typeof annots[k].annotationType === 'undefined') {
			    	annots[k].type = 'unknownType';
			    } else {
			    	annots[k].type = annots[k].annotationType;
			    }
		    }
	    }

    	return newJson;
    }



	/**
	 * AnnotationViewer properties.
	 *
	 * This variable contains the annotation viewer's interface.  Some are called by the users controller (like parseJson)
	 * but most are called by the viewers directives.
	 */
	var avp = {
			clickindex: -1,
			hoverindex: -1,
			getAnnotations: getAnnotations,
			getSpans: getSpans,
			setClickLocation: setClickLocation,
			hoverIn: hoverIn,
			hoverOut: hoverOut,
			getSpanText: getSpanText,
			pickColor: pickAnnotationColor,
			pickBackground: pickAnnotationBackground,
			getTypeGroups: getAnnotationTypeGroups,
			getTypesForGroup: getAnnotationTypesForGroup,
			toggleAll: toggleAll,
			toggleGroup: toggleGroup,
			setCheckboxDefault: setCheckboxDefault,
			parseJson: parseJson,
			parseJsonOldFormat: parseJsonOldFormat,
			clear: clearData,
			showAnnotationsPanel: true,
			selectAll: checkboxDefault,
			setDebugLevel: setDebugLevel,
			setPresetTypes: setPresetTypes
	};

	var factory = {};

	factory.getProperties = function() {
		return avp;
	}

	return factory;  // return our AnnotationViewer factory service to the caller.

};
