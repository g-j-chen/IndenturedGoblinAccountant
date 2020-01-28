var playerString = "";
var lootString = "";
var playerList;
var lootList;
var numPlayers;
var allocatedLootList = [];
var prevStorage = false;
var inputKeys;
var inputTally;
var listForStorage = [];


document.getElementById("split").onclick = function() {
	lootShare();
}


window.onload = function() {
	if (localStorage.length !== 0) {
		inputTally = JSON.parse(localStorage.getItem("tally"));
		console.log(inputTally);
		inputKeys = Object.keys(inputTally);
		var playersData = inputKeys.toString();
		document.getElementById("playerNames").value = playersData;
	}
}


function compareArrays(array1, array2) {
	array1.sort();
	array2.sort();
	for (var i = 0; i < array1.length; i++) {
		if (array1[i].toUpperCase() !== array2[i].toUpperCase()) {
			return false;
		}
	}
	return true;
}


function lootShare() {
	playerString = document.getElementById("playerNames").value;
	if (playerString === "") {
		alert("No one is getting any loot :(");
	} else {
		playerList = playerString.split(",");
		numPlayers = playerList.length;
		for (var i = 0; i < numPlayers; i++) {
			playerList[i] = playerList[i].trim();
		}
	}
	if (inputKeys && inputKeys.length === playerList.length) {
		prevStorage = compareArrays(inputKeys, playerList);
	}
	// Test: 8gp 5sp, 100gp gems x5, gold ring with black flying snake symbol 25gp, 4pp 13gp, 35gp, 12gp 55sp 87cp, silver salt and pepper shakers set 25gp, holy symbol of sylvanus 25gp, 12sp
	lootString = document.getElementById("lootNames").value;
	if (lootString === "") {
		alert("There's no loot!");
	} else {
		lootList = lootString.split(",");
		for (var i = 0; i < lootList.length; i++) {
			lootList[i] = lootList[i].trim();
		}
	}

	var separatedLootList = separateLoot(lootList);
	var goldAndGemstones = separatedLootList[0];
	var sortedLootItems = separatedLootList[1].sort((a, b) => (b.value - a.value));

	for (var i = 0; i < numPlayers; i++) {
		let v = [];
		let t = 0;
		if (prevStorage) {
			t = inputTally[i].total;
		}
		var c = {total: t, list: v};
		allocatedLootList.push(c);
	}
	
	allocateLoot(sortedLootItems);
	allocateGoldAndGemstones(goldAndGemstones);
	condenseLoot();
	showAllocatedLoot();
	localStorage.setItem("tally", JSON.stringify(inputTally));
	console.log(localStorage);
}


function separateLoot(array) {
	var goldAndGemstones = Array(6).fill(0); // ind 0: pp, 1: gemstones, 2: gp, 3: ep, 4: sp, 5: cp
	var lootItemArray = [];

	for (var i = 0; i < array.length; i++) {
		var item = array[i];
		if (item.toLowerCase().includes("gemstones")) {
			var value = parseInt(item.replace(/[^0-9]/g, ""), 10);
			goldAndGemstones[5] += value;
			continue;
		}

		var itemStringArray = item.split(" ");
		var len = itemStringArray.length;
		var isGold = true;
		for (var j = 0; j < len; j++) {
			var s = itemStringArray[j];
			if (s.match(/^[a-zA-Z]+$/)) {
				isGold = false;
				break;
			}
		}

		if (isGold) {
			for (var k = 0; k < len; k++) {
				var s = itemStringArray[k];
				var value = parseInt(s.replace(/[^0-9]/g, ""), 10);
				var type = s.substring(s.length - 2, s.length);
				var ind;
				switch(type) {
					case "pp":
						ind = 0;
						break;
					case "gp":
						ind = 2;
						break;
					case "ep":
						ind = 3;
						break;
					case "sp":
						ind = 4;
						break;
					case "cp":
						ind = 5;
						break;
					default:
						break;
				}
				goldAndGemstones[ind] += value;
			}
			continue;
		}

		if (!isGold) {
			var lootItem = "";
			var valueInGold = 0;
			var quantity = 1;
			for (var l = 0; l < len; l++) {
				var s = itemStringArray[l];
				if (s.match(/^[a-zA-Z]+$/)) {
					lootItem += s + " ";
				} else if (s.includes("pp") || s.includes("gp") || s.includes("ep") || s.includes("sp") || s.includes("cp")) {
					var temp = parseInt(s.replace(/[^0-9]/g, ""), 10);
					var type = s.substring(s.length - 2, s.length);
					valueInGold = getValueInGold(temp, type);
				} else if (s.match(/x{1}[0-9]+/)) {
					quantity = parseInt(s.replace(/[^0-9]/g, ""), 10);
				}
			}
			var itemTuple = {name: lootItem, value: valueInGold, actual: temp.toString() + type, amount: 1};
			if (quantity === 1) {
				lootItemArray.push(itemTuple);
			} else {
				for (var n = 1; n <= quantity; n++) {
					var newItemTuple = {name: lootItem, value: valueInGold, actual: temp.toString() + type, amount: 1};
					lootItemArray.push(newItemTuple);
				}
			}
			
		}
	}
	return [goldAndGemstones, lootItemArray];
}


function allocateLoot(array) {
	for (var i = 0; i < array.length; i++) {
		var item = array[i];
		var leastWorthInd = getLeastWorth(allocatedLootList);
		allocatedLootList[leastWorthInd].total += item.value;
		var l = allocatedLootList[leastWorthInd].list;
		var same = false;
		if (l.length > 0) {
			var prevItem = l.pop();
			if (prevItem.name === item.name) {
				let toAdd = prevItem.amount;
				item.amount = toAdd + 1;
				same = true;
			}
		}
		if (!same) {
			l.push(prevItem);
		}
		l.push(item);
		allocatedLootList[leastWorthInd].list = l;
	}
}


function allocateGoldAndGemstones(array) {
	for (var i = 0; i < array.length; i++) {
		var amountLeft = array[i];
		var type = getTypeFromIndex(i);
		while (amountLeft > 0) {
			var leastWorthInd = getLeastWorth(allocatedLootList);
			var leastWorthArray = Array(numPlayers).fill(0);
			var count = 0;
			for (var j = 0; j < numPlayers; j++) {
				if (allocatedLootList[j].total === allocatedLootList[leastWorthInd].total) {
					leastWorthArray[j] = 1;
					count++;
				}
			}

			var nextLeastInd = getNextLeast(allocatedLootList, leastWorthInd);
			var diffInGoldValue = allocatedLootList[nextLeastInd].total - allocatedLootList[leastWorthInd].total;

			if (diffInGoldValue === 0) {
				allocateEvenly(amountLeft, type);
				amountLeft = 0;
				break;
			}

			var convertedDiff = actualValueFromGold(diffInGoldValue.toFixed(2), type);
			if (!Number.isInteger(convertedDiff)) {
				convertedDiff = Math.floor(convertedDiff);
			}

			if (convertedDiff === 0) {
				amountLeft = 0;
				break;
			}

			if (count === 1) {
				if (amountLeft < convertedDiff) {
					convertedDiff = amountLeft;
				}
				addToAlloction(leastWorthInd, type, convertedDiff);
				amountLeft -= convertedDiff;
			} else if (count > 1) {
				var totalNeeded = convertedDiff * count;
				if (totalNeeded <= amountLeft) {
					for (var k = 0; k < numPlayers; k++) {
						if (leastWorthArray[k] === 1) {
							addToAlloction(k, type, convertedDiff);
							amountLeft -= convertedDiff;
						}
					}
				} else {
					var amountGiven = Math.floor(amountLeft / count);
					var remainder = amountLeft % count;
					var lastIndex = 0;
					if (amountGiven > 0) {
						for (var l = 0; l < numPlayers; l++) {
							if (leastWorthArray[l] === 1) {
								addToAlloction(l, type, amountGiven);
								lastIndex = l;
							}
						}
					}

					if (remainder > 0) {
						addToAlloction(lastIndex, type, remainder);
					}
					amountLeft = 0;
				}
			}
		}
	}
}


function allocateEvenly(amountLeft, type) {
	var amountGiven = Math.floor(amountLeft / numPlayers);
	var remainder = amountLeft % numPlayers;
	var currInd = 0;
	if (amountGiven > 0) {
		for (var i = 0; i < numPlayers; i++) {
			addToAlloction(i, type, amountGiven);
			currInd = i;
		}
	}

	if (remainder > 0) {
		var remainderGiven = 1;
		while (remainderGiven <= remainder) {
			addToAlloction(currInd, type, 1);
			remainderGiven++;
			currInd++;
			if (currInd === numPlayers) {
				currInd = 0;
			}
		}
	}
}


function addToAlloction(index, type, actual) {
	var valueInGold = getValueInGold(actual, type);
	allocatedLootList[index].total += valueInGold;
	allocatedLootList[index].list.push(actual.toString() + type);
}


function getLeastWorth(array) {
	var min = Number.MAX_SAFE_INTEGER;
	var index = -1;
	for (var i = 0; i < numPlayers; i++) {
		if (array[i].total < min) {
			min = array[i].total;
			index = i;
		}
	}
	return index;
}


function getNextLeast(array, leastWorthInd) {
	var diff = Number.MAX_SAFE_INTEGER;
	var index = 0;
	for (var i = 0; i < array.length; i++) {
		var temp = Math.abs(array[i].total - array[leastWorthInd].total);
		if (temp < diff && temp !== 0) {
			diff = temp;
			index = i;
		}
	}
	return index;
}


function getTypeFromIndex(index) {
	switch(index) {
		case 0:
			return "pp";
		case 1:
			return " gemstones";
		case 2:
			return "gp";
		case 3:
			return "ep";
		case 4:
			return "sp";
		case 5:
			return "cp";
	}
}


function getValueInGold(amt, type) {
	switch(type) {
		case "pp":
			return amt * 10;
		case " gemstones":
			return amt;
		case "gp":
			return amt;
		case "ep":
			return amt / 2;
		case "sp":
			return amt / 10;
		case "cp":
			return amt / 100;
		default:
			return;
	}
}


function actualValueFromGold(amt, type) {
	switch(type) {
		case "pp":
			return amt / 10;
		case " gemstones":
			return amt;
		case "gp":
			return amt;
		case "ep":
			return amt * 2;
		case "sp":
			return amt * 10;
		case "cp":
			return amt * 100;
	}
}


function shuffle(array) {
	var currIndex = array.length;
	var temp, randomIndex;

	while (currIndex != 0) {
		randomIndex = Math.floor(Math.random() * currIndex);
		currIndex -= 1;
		temp = array[currIndex];
		array[currIndex] = array[randomIndex];
		array[randomIndex] = temp;
	}
	return array;
}


function condenseLoot() {
	for (var i = 0; i < numPlayers; i++) {
		var l = allocatedLootList[i].list;
		var newList = [];
		var prevType = null;
		var prevSum = null;
		var lootStorage = [];
		for (var j = 0; j < l.length; j++) {
			var item = l[j];
			if ((typeof item) === "object") {
				var itemString = item.name + item.actual;
				var amt = item.amount;
				lootStorage.push({name: itemString, value: item.value, amount: amt});
				if (amt === 1) {
					newList.push(itemString);
				} else {
					newList.push(itemString + " x" + amt.toString());
				}
			} else if ((typeof item) === "string") {
				var itemType = item.substring(item.length - 2);
				var itemSum = parseInt(item.substring(0, item.length - 2));
				if (prevType === itemType) {
					newList.pop();
					var toAdd = prevSum;
					itemSum += toAdd;
					item = itemSum.toString() + itemType;
					if (j === l.length - 1) {
						lootStorage.push({name: item, value: getValueInGold(itemSum, itemType), amount: 1});
					}
				} else {
					if (prevSum !== null) {
						lootStorage.push({name: prevSum.toString() + prevType, value: getValueInGold(prevSum, prevType), amount: 1});
					}
				}
				newList.push(item);
				prevType = itemType;
				prevSum = itemSum;
			}
		}
		allocatedLootList[i].list = newList;
		listForStorage[i] = lootStorage;
	}
}


function showAllocatedLoot() {
	if (!prevStorage) {
		var shuffledPlayers = shuffle(Array.from(Array(numPlayers).keys()));
		inputTally = [];
	}

	var currentSplit = document.getElementById("currentSplit");

	for (var i = 0; i < numPlayers; i++) {
		var index = i;
		if (!prevStorage) {
			index = shuffledPlayers.indexOf(i);
		}
		var l = allocatedLootList[index].list;
		var loot = "";
		for (var j = 0; j < l.length; j++) {
			if (j === l.length - 1) {
				loot += l[j];
			} else {
				loot += l[j] + ", ";
			}
		}
		if (loot === "") {
			loot = "\u2639";
		}
			
		inputTally.push({player: playerList[i], total: allocatedLootList[index].total, loot: listForStorage[index]});

		var playerNameDiv = document.createElement("div");
		var nameEl = document.createElement("div");
		nameEl.appendChild(document.createTextNode(playerList[i]));
		playerNameDiv.appendChild(nameEl);
		nameEl.style.fontSize = "large";
		nameEl.style.fontWeight = "bold";
		playerNameDiv.appendChild(document.createTextNode("Net worth in gp: " + allocatedLootList[index].total.toString()));
		playerNameDiv.style.minHeight = "60px";
		

		var lootDiv = document.createElement("div");
		lootDiv.appendChild(document.createTextNode(loot));
		

		
		var playerDiv = document.createElement("div");
		playerDiv.style.backgroundColor = "#ffff66";
		playerDiv.style.margin = "20px 10px";
		playerDiv.style.width = "800px";
		playerDiv.appendChild(playerNameDiv);
		playerDiv.appendChild(lootDiv);
		playerNameDiv.style.cssFloat = "left";
		playerNameDiv.style.clear = "both";
		playerNameDiv.style.width = "30%";
		//playerNameDiv.style.backgroundColor = "#33ccff";
		playerNameDiv.style.textAlign = "center";
		playerNameDiv.style.marginLeft = "30px";
		lootDiv.style.cssFloat = "right";
		lootDiv.style.width = "50%";
		//lootDiv.style.backgroundColor = "#99ff99";
		lootDiv.style.marginLeft = "60px;"
		currentSplit.appendChild(playerDiv);
	}

	currentSplit.style.border = "thick solid #c6ced2";
	currentSplit.style.backgroundColor = "#c6ced2";
	currentSplit.style.borderRadius = "10px";
	currentSplit.style.overflow = "hidden";
	currentSplit.style.padding = "0px 20px 20px 20px";
	currentSplit.style.marginLeft = "200px";
}