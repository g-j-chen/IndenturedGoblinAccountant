var playerString = "";
var lootString = "";
var playerList;
var lootList;
var numPlayers;
var allocatedLootList = [];
var listForStorage = [];


document.getElementById("split").onclick = function() {
	lootShare();
	allocatedLootList = [];
	lootList = [];
}


window.onload = function() {
	var prevTally = JSON.parse(localStorage.getItem("tally"));

	if (prevTally !== null) {
		showAllSplits(prevTally);

		var mostRecentTally = prevTally[0];
		var prevNames = []
		for (var i = 0; i < mostRecentTally.length; i++) {
			prevNames.push(mostRecentTally[i].player_name);
		}
		document.getElementById("playerNames").value = prevNames.join(", ");
	}
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
		var c = {total: 0, list: v};
		allocatedLootList.push(c);
	}
	
	allocateLoot(sortedLootItems);
	allocateGoldAndGemstones(goldAndGemstones);
	condenseLoot();
	assignLootToPlayers();
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
			var itemTuple = {name: lootItem + temp.toString() + type, value: valueInGold, amount: 1};
			if (quantity === 1) {
				lootItemArray.push(itemTuple);
			} else {
				for (var n = 0; n < quantity; n++) {
					var newItemTuple = {name: lootItem + temp.toString() + type, value: valueInGold, amount: 1};
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


function addToAlloction(index, type, amount) {
	var valueInGold = getValueInGold(amount, type);
	allocatedLootList[index].total += valueInGold;
	allocatedLootList[index].list.push(amount.toString() + type);
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
		var prevType = null;
		var prevSum = null;
		var lootStorage = [];
		for (var j = 0; j < l.length; j++) {
			var item = l[j];
			if ((typeof item) === "object") {
				lootStorage.push({name: item.name, value: item.value, amount: item.amount});
			} else if ((typeof item) === "string") {
				var itemType = item.substring(item.length - 2);
				var itemSum = parseInt(item.substring(0, item.length - 2));
				var itemValue = getValueInGold(itemSum, itemType);
				if (prevType === itemType) {
					var prev = lootStorage.pop();
					itemValue += prev.value;
					itemSum += prevSum;
					item = itemSum.toString() + itemType;
				}
				lootStorage.push({name: item, value: itemValue, amount: 1});
				prevType = itemType;
				prevSum = itemSum;
			}
		}
		listForStorage[i] = lootStorage;
	}
}


function assignLootToPlayers() {
	var shuffledPlayers = shuffle(Array.from(Array(numPlayers).keys()));
	var inputTally = [];

	for (var i = 0; i < numPlayers; i++) {
		var index = shuffledPlayers.indexOf(i);
		inputTally.push({player_name: playerList[i], loot: listForStorage[index]});
	}
	var prevTally = JSON.parse(localStorage.getItem("tally"));
	if (prevTally === null) {
		prevTally = [];
		prevTally.push(inputTally);
	} else {
		prevTally.splice(0, 0, inputTally);
	}
	localStorage.setItem("tally", JSON.stringify(prevTally));
	showAllSplits(prevTally);
}


function showAllSplits(prevTally) {
	var splits = document.getElementById("splits");
	splits.innerHTML = "";
	for (var i = prevTally.length - 1; i >= 0; i--) {
		formatSingleSplit(prevTally[i]);
		let theFirstChild = splits.firstChild;
		splits.insertBefore(document.createElement("br"), theFirstChild);
	}
}


function formatSingleSplit(splitArr) {
	//create div to hold and display all player's loot, formatted
	var currentSplit = document.createElement("div");
	currentSplit.style.border = "thick solid #C6CED2";
	currentSplit.style.backgroundColor = "#C6CED2";
	currentSplit.style.borderRadius = "10px";
	currentSplit.style.overflow = "hidden";
	currentSplit.style.width = "70%";
	currentSplit.style.margin = "auto";
	//document.getElementById("splits").appendChild(currentSplit);
	var splits = document.getElementById("splits");
	let theFirstChild = splits.firstChild;
	splits.insertBefore(currentSplit, theFirstChild);
	
	for (var i = 0; i < splitArr.length; i++) {
		var playerName = splitArr[i].player_name;
		var lootArr = splitArr[i].loot;

		//create div to wrap everything in, formatted
		var playerDiv = document.createElement("div");
		playerDiv.style.marginTop = "10px";
		playerDiv.style.width = "auto";
		playerDiv.style.overflow = "hidden";
		//playerDiv.style.border = "thin solid #B3B3FF"
		playerDiv.style.borderRadius = "10px";
		currentSplit.appendChild(playerDiv);
		//playerDiv.style.backgroundColor = "#FFFF66"; //use when need to see where div is...

		//inserting <hr /> between each playerDiv
		if (i < splitArr.length - 1) {
			var lineBreak = document.createElement("HR");
			currentSplit.appendChild(lineBreak);
			lineBreak.style.width = "90%";
		}

		//create div to hold both name and net worth, floats on left, formatted
		var playerNameNetWorthDiv = document.createElement("div");
		playerNameNetWorthDiv.style.cssFloat = "left";
		playerNameNetWorthDiv.style.width = "30%";
		playerNameNetWorthDiv.style.textAlign = "center";
		playerNameNetWorthDiv.style.minHeight = "80px";
		//playerNameNetWorthDiv.style.backgroundColor = "#33CCFF"; //use when need to see where div is...
		playerDiv.appendChild(playerNameNetWorthDiv);

		//create div for name
		var nameEl = document.createElement("div");
		nameEl.style.fontSize = "large";
		nameEl.style.fontWeight = "bold";
		nameEl.appendChild(document.createTextNode(playerName));
		//adding name element
		playerNameNetWorthDiv.appendChild(nameEl);
		//creating and adding div under name element to hold net worth
		playerNameNetWorthDiv.appendChild(document.createTextNode("Amount in gp: " + getNetWorth(lootArr)));

		//create div to show loot as an <ul>
		var lootDiv = document.createElement("div");
		var lootDivList = document.createElement("ul");
		lootDivList.style.marginTop = "0";
		lootDivList.style.marginBottom = "0";
		lootDiv.style.cssFloat = "right";
		lootDiv.style.width = "70%";
		lootDiv.appendChild(lootDivList);
		playerDiv.appendChild(lootDiv);
		//lootDiv.style.backgroundColor = "#99FF99"; //use when need to see where div is	

		//processing loot to output as list in lootDiv
		if (lootArr.length === 0) {
			var li = document.createElement("li");
			li.appendChild(document.createTextNode("\u2639"));
			lootDivList.appendChild(li);
		} else {
			for (var j = 0; j < lootArr.length; j++) {
				var lootItemString = lootArr[j].name;
				if (lootArr[j].amount > 1) {
					lootItemString += " x" + lootArr[j].amount;
				}
				var li = document.createElement("li");
				li.appendChild(document.createTextNode(lootItemString));
				lootDivList.appendChild(li);
			}
		}
	}
}


function getNetWorth(lootArr) {
	var netWorth = 0;
	for (var i = 0; i < lootArr.length; i++) {
		netWorth += lootArr[i].value;
	}
	return netWorth;
}