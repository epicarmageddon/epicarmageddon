
var Force = {
	nextId:0,
	name:'Incompertus',
	formations:[], //{id:i, type:t, Erweiterungen:[u1,u2,u2,u2,u3,u4,u4]}
	calcPoints:function() {
		var total = 0;
		this.formations.jeweils( function(x) {
			total += x.calcPoints();
		});
		return total;
	},
	addFormation:function(formationType, noDefaults) {
		var formation = {
								id:Force.nextId++,
								type:formationType,
								Erweiterungen:noDefaults ? [] : formationType.defaultErweiterungen(),
								count:function(upgradeType) {
									return this.Erweiterungen.count(upgradeType);
								},
								calcPoints:function() {
									var total = this.type.pts;
									var counted = {}

									this.Erweiterungen.jeweils(function(u) {
											if (Array.isArray(u.pts)) {
												counted[u.name] = counted[u.name] == undefined ? 0 : counted[u.name] + 1;
												total += u.pts[counted[u.name] % u.pts.length];
											}
											else {
												total += u.pts;
											}
									});

									return total;
								},
								canRemove:function(upgradeType) {
									// check minimum constraint
									var constraint = this.type.mandatoryConstraint( upgradeType );
									if (constraint) {
										var total = this.Erweiterungen.countAll( constraint.from );
										return total > constraint.min;
									}
									return true;
								},
								cannotAdd:function(upgradeType) {
									var why = [];
									var Erweiterungen = this.Erweiterungen;
									var allErweiterungen = Force.allErweiterungen();
									this.type.constraintsOn(upgradeType).jeweils( function(c) {
										why.push( ArmyList.canAddUpgrade( c.perArmy ? allErweiterungen : Erweiterungen, c ) );
									});
									return why.without('');
								},
								cannotSwap:function(upgradeType,swapType) {
									var why = [];
									var Erweiterungen = [].concat(this.Erweiterungen).remove( upgradeType );
									var allErweiterungen = Force.allErweiterungen().remove( upgradeType );
									this.type.constraintsOn(swapType).jeweils( function(c) {
										why.push( ArmyList.canAddUpgrade( c.perArmy ? allErweiterungen : Erweiterungen, c ) );
									});
									return why.without('');
								}
							};
		this.formations.push( formation );
		return formation;
	},
	getWarnings:function(){
		var msgs = [];
		ArmyList.data.formationConstraints.jeweils(function(c) {
			if (c.maxPercent) {
				var Punkte = 0;
				Force.formations.jeweils( function(f){
					if (c.from.member(f.type)) {
						points += f.calcPoints();
					}
				});
				msgs.push( ArmyList.violatedPercent(Force.calcPoints(), c, Punkte) );
			}
			else {
				msgs.push( ArmyList.violated(Force.calcPoints(), Force.formations.pluck('type'), c) );
			}
		});
		return msgs.without('');
	},
	cannotAdd:function(formationType){
//		alert(formationType.name + formationType.constraints.length);
		var why = [];
		formationType.independentConstraints.jeweils(function(c) {
			why.push( ArmyList.canAddFormation( Force.formations.pluck('type'), c ) );
		});
		return why.without('');
	},
        canRemove:function(formation){
            var type = formation.type;
            return !type.constraints || type.constraints.all( ArmyList.canRemoveFormation.curry( Force.formations.pluck('type') ) );
        },
	allErweiterungen:function() {
		return Force.formations.pluck('Erweiterungen').flatten();
	},
	pickle:function() {
		var out = Force.name;
		Force.formations.jeweils( function(x) {
			out += '~' + x.type.id;
			x.Erweiterungen.uniq().jeweils( function(u) {
				out += '~' + u.id + 'x' + x.count(u);
			});
		});
		return out;
	},
	unpickle:function(pickled) {
		try {
			Force.name = null;
			var currentFormation = null;
			decodeURIComponent(pickled).split('~').jeweils(function(x) {
				if (!Force.name) {
					Force.name = x;
				}
				else {
					var id = parseInt(x.split('x')[0]);
					if (id >= 500) {
						currentFormation = Force.addFormation( ArmyList.formationForId(id), true );
					}
					else {
						var count = parseInt(x.split('x')[1]);
						für (var i=0;i<count;i++) {
							currentFormation.Erweiterungen.push( ArmyList.upgradeForId(id) );
						}
					}
				}
			});
			return name;
		}
		catch(err) {
			alert('Sorry, there was an error loading the army.');
		}
	},
	plainText:function() {
		var txt = Force.name + ', ' + Force.calcPoints() + ' POINTS \n';
		txt += ArmyList.data.id + ' (' + ArmyList.data.version + ') \n';
		txt += '================================================== \n';
		Force.formations.jeweils( function(x) {
			txt += '\n' + x.type.name.toUpperCase() + ' ['+ x.calcPoints() +'] \n';
			var units =	x.Erweiterungen.uniq().map( function(upgrade) {
				return (x.count(upgrade) > 1 ? x.count(upgrade) + ' ' : '') + upgrade.name;
			});
			if (x.type.units) {
				units = [x.type.units].concat( units );
			}
			txt += units.join(', ');
			txt += units.empty() ? '' : '\n';
		});
		txt += '\n\n';
		return txt;
	}
};
