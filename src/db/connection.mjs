import mongoose from 'mongoose'
import config from 'config'

const uriDb = config.get('MONGO_URL') || ''

mongoose.set('strictQuery', false)
export const connection = mongoose.connect(uriDb)
