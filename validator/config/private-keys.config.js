require('dotenv').config()
const aws = require('aws-sdk')
const s3 = new aws.S3()

const { KEY_BUCKET_NAME, KEY_PATH } = process.env

async function getValidatorKey() {
  if (!KEY_BUCKET_NAME || !KEY_PATH) {
    throw new Error("Validator private key path is not specified")
  }
  const result = await s3.getObject({
    Bucket: KEY_BUCKET_NAME,
    Key: KEY_PATH,
  }).promise()
  return result.Body.toString()
}

module.exports = { getValidatorKey }
