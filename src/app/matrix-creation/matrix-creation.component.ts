import { Component } from '@angular/core';
import { AoeData } from "../data/aoeData";
import { Player } from "./../classes/player";
import { Color } from "./../helper/color";
import { Battle } from "./../classes/battle";
import { CivUnitType } from '../classes/civUnitType';
import { MatrixData } from '../data/matrixData';
import { Helpers } from '../helper/helpers';
import { ColorMap } from '../helper/colorMap';

@Component({
  selector: 'app-matrix-creation',
  templateUrl: './matrix-creation.component.html',
  styleUrls: ['./matrix-creation.component.css']
})
export class MatrixCreationComponent{

	// dynamically calculated parts (of the matrix component) //
	public combatResults: number[][];
	public combatResultsPoints: number[];
	public player1CivUts: CivUnitType[] = [] // player 1 always has 50 units and occupies the matrix's rows (left)
	public player2CivUts: CivUnitType[] = [] // player 2 has either 50 units or a number of units with equal costs to player 1's army and occupies the matrix's columns (top)

	public hitAndRunMode: number = 1; // 0=noHit&Run, 1=semi, 2=fullHit&Run
	public hitAndRunModes: string[] = ["No Hit&Run", "Medium Hit&Run", "Perfect Hit&Run"];

	public resourceValue: number = 2; // 0=equal worth, 1=gold+50% worth, 2=100f=100w=17g
	public resourceValues: string[] = ["100F=100W=100G", "100F=100W=66,6G", "100F=100W=17G"];
	public resourceValuesFactors: number[][] = [[1, 1, 1], [1, 1, 1.5], [1, 1, 5.88235]];

	public combatType: number = 0;
	public combatTypes: string[] = ["Equal resources", "Equal numbers", "Equal numbers rep."];

	public numberOfSimulations: number = 40;
	public ut1: number; // global index counter variable
	public ut2: number; // global index counter variable
	public showAvgCol: boolean = true;
	public sortRows: boolean = false;

	public players: Player[];

	public numberUtToDisplayRows: number; // to display all unit types in the matrix, set this to 57; to display all non-unique unit types, set this to 15
	public numberUtToDisplayColumns: number; // to display all unit types in the matrix, set this to 57; to display all non-unique unit types, set this to 15

	public working: boolean = false;
	// end of dynamically calculated parts //

	private battleRef: Battle;

	constructor() {
		this.player1CivUts = MatrixData.allFinalUnitTypes_ror;
		this.player2CivUts = MatrixData.allFinalUnitTypes_ror;
		this.InitializeMatrix();
	}


	public InitializeMatrix(){
		this.combatResults = [];
		this.combatResultsPoints = [];
		this.numberUtToDisplayRows = this.player1CivUts.length;
		this.numberUtToDisplayColumns = this.player2CivUts.length;
		for(let i: number = 0; i < this.numberUtToDisplayRows; i++){
			this.combatResults.push([]);
			this.combatResultsPoints.push(0);
			for (let j: number = 0; j < this.numberUtToDisplayColumns; j++){
				this.combatResults[i].push((this.player1CivUts[i].civ == this.player2CivUts[j].civ && this.player1CivUts[i].baseUnitType.name == this.player2CivUts[j].baseUnitType.name) ? 1 : 0);
			}
		}
	}


	public StartMatrixCalculations(){
		this.working = true;
		this.ut1 = this.ut2 = 0;
		this.InitializeMatrix();
		setTimeout(this.CreateBattles.bind(this), 0);
	}


	public CreateBattles(){

		if (this.player1CivUts[this.ut1].civ != this.player2CivUts[this.ut2].civ || this.player1CivUts[this.ut1].baseUnitType.name != this.player2CivUts[this.ut2].baseUnitType.name){
			this.players = [new Player(new Color(0, 0, 128), 0), new Player(new Color(0, 0, 128), 1)];

			this.players[0].civUts = this.player1CivUts;
			this.players[1].civUts = this.player2CivUts;
			this.players[0].ResetData();
			this.players[1].ResetData();

			this.players[0].amountStartUnits[this.ut1] = AoeData.utl_karambitWarrior.unitTypes.includes(this.players[0].civUts[this.ut1].baseUnitType) ? 100 : 50;
			this.players[1].amountStartUnits[this.ut2] = AoeData.utl_karambitWarrior.unitTypes.includes(this.players[1].civUts[this.ut2].baseUnitType) ? 100 : 50;
			this.players[0].CalculateResourcesInvested(this.resourceValuesFactors[this.resourceValue]);
			this.players[1].CalculateResourcesInvested(this.resourceValuesFactors[this.resourceValue]);
			if (this.combatType == 0){
				this.players[1].amountStartUnits[this.ut2] = Math.round(this.players[1].amountStartUnits[this.ut2] * this.players[0].resourcesInvestedTotal / this.players[1].resourcesInvestedTotal);
				this.players[1].CalculateResourcesInvested(this.resourceValuesFactors[this.resourceValue]);
			}

			if (this.combatType == 0 || this.combatType == 1){
				for (let i: number = 0; i < this.numberOfSimulations; i++){
					new Battle(0, i, this.hitAndRunMode, this.players);
				}
			} else if (this.combatType == 2){
				this.battleRef = new Battle(0, 0, this.hitAndRunMode, this.players, this.numberOfSimulations-1);
			}

			this.CalculateStats();
			// Since negative values for resourcesLost are possible (e.g. Keshiks with their gold generation vs. Skirmishers), we have to address special cases
			this.combatResults[this.ut1][this.ut2] = this.players[0].resourcesLostTotal > 0 ? Math.max(this.players[1].resourcesLostTotal / this.players[0].resourcesLostTotal, 0) : Number.POSITIVE_INFINITY;
			// console.log(this.ut1 + " " + this.ut2 + ": " + this.combatresults[this.ut1][this.ut2] + " (" + this.players[0].resourcesLostTotal + " / " + this.players[1].resourcesLostTotal + ")");
		}

		this.ut2++;
		if (this.ut2 == this.numberUtToDisplayColumns){
			let points: number = Helpers.calculatePointsOfCivUnitType(this.combatResults[this.ut1]);
			this.combatResultsPoints[this.ut1] = points;
			this.ut2 = 0;
			this.ut1++;
		}
		
		if (this.ut1 < this.numberUtToDisplayRows){
			setTimeout(this.CreateBattles.bind(this), 20);
		} else {
			let outputstring: string = "";
			this.combatResults.forEach(arr => {
				outputstring = outputstring.concat("[" + arr + "],\n");
			})
			console.log(outputstring);

			/* Sorting of the matrix rows*/
			if (this.sortRows){
				let tempSortList = [];
				for (let row = 0; row < this.numberUtToDisplayRows; row++){
					tempSortList.push({'civUnitType': this.player1CivUts[row], 'cR': this.combatResults[row]});
				}
				tempSortList.sort(function(a, b){
					return (a.cR[a.cR.length-1] < b.cR[b.cR.length-1] ? 1 : (a.cR[a.cR.length-1] == b.cR[b.cR.length-1] ? 0 : -1));
				});
				for (let row = 0; row < this.numberUtToDisplayRows; row++){
					this.player1CivUts[row] = tempSortList[row].civUnitType;
					this.combatResults[row] = tempSortList[row].cR;
				}
			}
			this.working = false;
		}
	}


	public getSurvivorsColor(costEffValue: number): string {
		return ColorMap.getSurvivorsColor(costEffValue)
	}


	private CalculateStats(): void
	{
		for (let i: number = 0; i < 2; i++)
		{
			this.players[i].populationRemaining = 0;
			for (let k: number = 0; k < 3; k++)
			{
				this.players[i].resourcesRemaining[k] = 0;
				this.players[i].resourcesGenerated[k] /= this.numberOfSimulations;
				this.players[i].resourcesLost[k] = 0;
			}

			for (let j: number = 0; j < this.players[i].civUts.length; j++)
			{
				this.players[i].avgSurvivorsNumber[j] = 1.0 * this.players[i].survivorsSumArmy[j] / this.numberOfSimulations;
				this.players[i].populationRemaining += this.players[i].avgSurvivorsNumber[j] * (AoeData.utl_karambitWarrior.unitTypes.includes(this.players[i].civUts[j].baseUnitType) ? 0.5 : 1.0);

				for (let k: number = 0; k < 3; k++)
				{
					this.players[i].resourcesRemaining[k] += Math.round(this.players[i].civUts[j].resourceCosts[k] * this.players[i].avgSurvivorsNumber[j]);
				}
			}
			this.players[i].populationLost = this.players[i].populationInvested - this.players[i].populationRemaining;

			for (let j: number = 0; j < 3; j++)
			{
				this.players[i].resourcesRemaining[j] += this.players[i].resourcesGenerated[j]; // first add the resources generated to the resources remaining in order to correctly calculate the resources lost
				
				// there is a special case for Konniks - since a Konnik's controller doesn't have to substitute all dead Konniks every repeated battle (they're automatically replaced by dismounted Konniks)
				if (this.combatType == 2 && this.battleRef.sum_lostKonniks[i] > 0){
					this.players[i].resourcesLost[j] = (this.battleRef.sum_lostKonniks[i] / this.numberOfSimulations) * AoeData.ut_eliteKonnik.resourceCosts[j];
				} else{ // normal case
					this.players[i].resourcesLost[j] = this.players[i].resourcesInvested[j] - this.players[i].resourcesRemaining[j];
				}
				// console.log("Res lost Player " + i + " with " + this.player1CivUts[this.ut1].name + " vs " + this.player2CivUts[this.ut2].name + ": " + this.players[i].resourcesLost[j]);
			}
		}
		this.CalculateWeightedSum();
	}

	public CalculateWeightedSum(): void{
		for (let i: number = 0; i < 2; i++) {
			this.players[i].resourcesLostTotal = 0;
			this.players[i].resourcesRemainingTotal = 0;
			this.players[i].resourcesGeneratedTotal = 0;
			for (let j: number = 0; j < 3; j++) {
				this.players[i].resourcesLostTotal += this.players[i].resourcesLost[j] * this.resourceValuesFactors[this.resourceValue][j];
				this.players[i].resourcesRemainingTotal += this.players[i].resourcesRemaining[j] * this.resourceValuesFactors[this.resourceValue][j];
				this.players[i].resourcesGeneratedTotal += this.players[i].resourcesGenerated[j] * this.resourceValuesFactors[this.resourceValue][j];
			}
		}
	}

	public CreateIncrArray(n: number): number[] {
		return [...Array(n).keys()];
	}

	public SetHnR(mode: number){
		this.hitAndRunMode = mode;
	}

	public SetRV(mode: number){
		this.resourceValue = mode;
	}

	public SetCT(mode: number){
		this.combatType = mode;
	}
}
