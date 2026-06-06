import prisma from './lib/prisma'

console.log('User model:', !!prisma.user)
if (prisma.user) {
    console.log('Success, User model exists.')
} else {
    console.log('Prisma object keys:', Object.keys(prisma))
}
