dojo.provide("racquelDijits.racquelControlDijit");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("dijit.form.CheckBox");
dojo.require("dijit.Dialog");
dojo.require("dojo.parser");
dojo.require("dijit.layout.ContentPane");
dojo.declare("racquelDijits.racquelControlDijit",[dijit._Widget, dijit._Templated],{
	widgetsInTemplate:true,
	templatePath:dojo.moduleUrl("racquelDijits","templates/racquelControlDijit.html"),
	constructor: function(params){
		this._parentToolbar = params.racquelToolbar;
		this._layersChanged = false;
		this._builtParams = false;
		
	},
	startup:function(){
		dojo.connect(this._racquelControlOKButton,"onClick",dojo.hitch(this,this.saveTasks));
		dojo.connect(this._racquelControlCancelButton,"onClick",dojo.hitch(this,this.cancelTasks));
		this._ControlDijitSite.set('onChange',dojo.hitch(this,function(){
			this._layersChanged = true;
		}));
		this._ControlDijitRoutes.set('onChange',dojo.hitch(this,function(){
			this._layersChanged = true;
		}));
		this._ControlDijitCatchment.set('onChange',dojo.hitch(this,function(){
			this._layersChanged = true;
		}));
	},
	loadSettings: function(){
		var currentSettings = this._parentToolbar.racquelInteractiveSettings;
		var availableParams = currentSettings.getAvailableParams();
		if (!this._builtParams) {
			var hasExtractions = false;
			for (var param in availableParams) {
				if (availableParams.hasOwnProperty(param) && param !== "error") {
					hasExtractions=true;
					var cb = new dijit.form.CheckBox({
						name: "checkBox",
						value: "blah",
						checked: false,
						onChange: dojo.hitch(this, function(){
							this._layersChanged = true;
						}),
						id: "cbExtraction_" + param,
						label: availableParams[param]["LayerName"],
						title: availableParams[param]["LayerDescription"]
					});
					dojo.addClass(cb.domNode,"racquelControlExtractionCB");	
					cb.startup();
					//cb.className = "racquelControlExtractionCB";
					var cbDiv = dojo.create("div",{
						className: "racquelControlExtractionItem"
					});
					cbDiv.appendChild(cb.domNode);
					cbDiv.appendChild(dojo.create("span",{
						innerHTML: "<label for="+cb.id+">"+cb.label+"</label>"
					}));
					//dojo.byId("racquel_catch_sub_tasks").appendChild(cb.domNode)
					dojo.byId("racquel_catch_sub_tasks").appendChild(cbDiv);
				}
			}
			if (!hasExtractions){
				dojo.byId("racquel_catch_sub_tasks_label").innerHTML = 
					"No datasets are available for extraction with RACQUEL's current server settings"
			}
			this._builtParams = true;
		}
		// set the search task checkboxes to match what is currently recorded in the racquelSearchSettings
		this._ControlDijitSite.set('checked',currentSettings.doSite());
		this._ControlDijitRoutes.set('checked',currentSettings.doRoute());
		this._ControlDijitCatchment.set('checked',currentSettings.doCatchment());
		// set the extraction task checkboxes to match what is currently recorded in the racquelSearchSettings
		var currentParams = currentSettings.getCatchmentParams();
		for (var currentParam in availableParams){
			if (currentParams.hasOwnProperty(currentParam)){
				dijit.byId("cbExtraction_"+currentParam).set('checked',
					currentParams[currentParam]);
			}
		}
		//this._ControlDijitNetLoc.set('checked',currentParams.useNetLocation());
		this._layersChanged = false;
	},
	saveTasks: function(){
		var currentParams = this._parentToolbar.racquelInteractiveSettings;
		currentParams.setSite(this._ControlDijitSite.get('checked'));
		currentParams.setRoute(this._ControlDijitRoutes.get('checked'));
		currentParams.setCatchment(this._ControlDijitCatchment.get('checked'));
		// would be best to disable these sub-checkboxes. Never mind, the racquelSearchSettings object 
		// won't keep them if the catchment hasn't first been set (and in any case they'd have no effect
		// as the search dijit wouldn't read them)
		// not currently in use 
		var checkBoxes = dojo.query(".racquelControlExtractionCB");
		
		dojo.forEach(checkBoxes,dojo.hitch(this,function(checkBoxInnards){
			var checkBox = dijit.getEnclosingWidget(checkBoxInnards);
			//var paramname = checkBox.id.split('_')[1]; // doesn't work when param has an underscore in it
			var paramname = checkBox.id.replace("cbExtraction_","");
			if (checkBox.get('checked')){
				currentParams.setExtractionParam(paramname,true);
			}
			else {
				currentParams.setExtractionParam(paramname,false);
			}
		}));
		//currentParams.setElev(this._ControlDijitElev.get('checked'));
		//currentParams.setLCM2K(this._ControlDijitLCM.get('checked'));
		//currentParams.setUpstream(this._ControlDijitUpstream.get('checked'));
		// likewise these won't be saved as true in racquelSearchSettings unless the preconditions are met
		//currentParams.setCatchmentQC(this._ControlDijitQC.get('checked'));
		//currentParams.setUseNetLoc(this._ControlDijitNetLoc.get('checked'));
		this._ControlDijitDialog.hide();
	},
	cancelTasks: function(){
		this._ControlDijitDialog.hide();
	},
	showDialog: function(){
		this.loadSettings();
		this._ControlDijitDialog.show();
	}
});
