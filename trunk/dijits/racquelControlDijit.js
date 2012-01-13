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
	},
	startup:function(){
		dojo.connect(this._racquelControlOKButton,"onClick",dojo.hitch(this,this.saveTasks));
		dojo.connect(this._racquelControlCancelButton,"onClick",dojo.hitch(this,this.cancelTasks));
	},
	loadSettings: function(){
		var currentParams = this._parentToolbar.racquelInteractiveSettings;
		this._ControlDijitSite.set('checked',currentParams.doSite());
		this._ControlDijitRoutes.set('checked',currentParams.doRoute());
		this._ControlDijitCatchment.set('checked',currentParams.doCatchment());
		this._ControlDijitElev.set('checked',currentParams.doElev());
		this._ControlDijitLCM.set('checked',currentParams.doLCM2K());
		this._ControlDijitUpstream.set('checked',currentParams.doUpstream());
		this._ControlDijitQC.set('checked',currentParams.doCatchmentQC());
		this._ControlDijitNetLoc.set('checked',currentParams.useNetLocation());
	},
	saveTasks: function(){
		var currentParams = this._parentToolbar.racquelInteractiveSettings;
		currentParams.setSite(this._ControlDijitSite.get('checked'));
		currentParams.setRoute(this._ControlDijitRoutes.get('checked'));
		currentParams.setCatchment(this._ControlDijitCatchment.get('checked'));
		// would be best to disable these sub-checkboxes. Never mind, the racquelSearchSettings object 
		// won't keep them if the catchment hasn't first been set (and in any case they'd have no effect
		// as the search dijit wouldn't read them)
		currentParams.setElev(this._ControlDijitElev.get('checked'));
		currentParams.setLCM2K(this._ControlDijitLCM.get('checked'));
		currentParams.setUpstream(this._ControlDijitUpstream.get('checked'));
		// likewise these won't be saved as true in racquelSearchSettings unless the preconditions are met
		currentParams.setCatchmentQC(this._ControlDijitQC.get('checked'));
		currentParams.setUseNetLoc(this._ControlDijitNetLoc.get('checked'));
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
