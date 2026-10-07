'use strict'

async function go (submissionWithGap) {
  let message

  const { returnLogId, versionId } = submissionWithGap

  try {
  } catch (error) {
    console.error(`Error: ${error.message}`, submissionWithGap, error)
    message = `Ret. log ${returnLogId} / Version ${versionId} error: ${error.message}`
  }

  return message
}

module.exports = {
  go
}
