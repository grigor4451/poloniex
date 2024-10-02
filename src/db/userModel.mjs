import mongoose from 'mongoose'

const Schema = mongoose.Schema

const userSchema = new Schema(
  {
    id: {
      type: Number,
      unique: true,
    },
    first_name: {
      type: String,
    },
    username: {
      type: String,
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    card: {
      type: String,
      default: '',
    },
    balance: {
      type: Number,
      default: 0,
    },
    limit: {
      type: Number,
      default: 350000,
    },
    fart: {
      type: String,
      default: 'Всегда вин',
    },
    fio: {
      type: String,
      default: '',
    },
    withdrawBlocked: {
      type: Boolean,
      default: false,
    },
    betBlocked: {
      type: Boolean,
      default: false,
    },
    isWorker: {
      type: Boolean,
      default: false,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    deposit: {
      type: Number,
      default: 5000,
    },
    mamonts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
      }
    ]
  },
  { versionKey: false, timestamps: true }
)

export const User = mongoose.model('users', userSchema)
