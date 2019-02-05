const capitalizeFirstLetter = (stringToChange) => {
    return stringToChange.charAt(0).toUpperCase() + stringToChange.slice(1);
}
const capitalizeFirstLetters = (stringToChange) => {
    return stringToChange.split(' ').map(capitalizeFirstLetter).join(' ');
}
const padLeft = (nr, n, str) => { // fillLeft
    return Array(n - String(nr).length + 1).join(str || '0') + nr;
}

module.exports = {
	capitalizeFirstLetter: capitalizeFirstLetter,
	capitalizeFirstLetters: capitalizeFirstLetters,
	padLeft: padLeft
}
