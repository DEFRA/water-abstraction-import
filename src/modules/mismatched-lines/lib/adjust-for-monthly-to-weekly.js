'use strict'

/**
 * Adjust the end date of monthly submission lines or readings ready for matching to a weekly frequency
 *
 * When the existing submission lines are monthly but the required frequency is weekly, this function adjusts the lines
 * for a better transformation.
 *
 * When the weeks are calculated, you will generally find that it spans the end and start of a month, and the end of the
 * month will fall somewhere in that week.
 *
 * Because WRLS weekly lines always end on a Saturday, when we match the existing monthly lines to a weekly frequency,
 * it will result in the quantities seeming to 'shift' into the next month.
 *
 * For example, the monthly line is 01/04/2018 to 30/04/2018. That will match with the new weekly line of 29/04/2018 to
 * 05/05/2018. This means both WRLS and downstream systems will 'shift' the abstraction from April to May.
 *
 * It also means we have the known issue of the 'last week'. Unlike monthly lines, the last weekly line will be the last
 * full week for the return period. For example, for the winter cycle of 01/04/2018 to 31/03/2019, the last weekly line
 * will be 24/03/2019 to 30/03/2019. This means an existing monthly line of 01/03/2019 to 31/03/2019 will not match.
 *
 * So, for this specific scenario, we adjust the 'end date' of each line back 6 days. This will ensure it matches with
 * the last week of the same month, thus avoiding any 'shifting' or lines not being matched.
 *
 * @param {object[]} linesToBeAdjusted - Either the existing submissions lines or readings that are monthly
 */
function go (linesToBeAdjusted) {
  for (const lineToBeAdjusted of linesToBeAdjusted) {
    // We avoid issues by first cloning, amending then assigning a local date value, instead of trying to edit `endDate`
    // in place.
    const newEndDate = new Date(lineToBeAdjusted.endDate)

    newEndDate.setDate(newEndDate.getDate() - 6)

    lineToBeAdjusted.endDate = newEndDate
  }
}

module.exports = {
  go
}
