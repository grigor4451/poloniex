import { User } from "../db/userModel.mjs"

export async function fetchUser(tgUser, workerId) {
  let user = await User.findOne({ id: tgUser.id }).populate('mamonts')

  if (user) return user

  user = await User.create({ ...tgUser })
  await user.save()

  if (workerId) {
    const worker = await User.findOne({ id: workerId })
    if (worker) {
      worker.mamonts.push(user._id)
      await worker.save()
    }
  }

  return user
}

export async function updateToWorker(tgUser) {
  const user = await User.findOneAndUpdate({ id: tgUser.id }, { isWorker: true })
  return user
}
