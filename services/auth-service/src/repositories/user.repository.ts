import { prisma } from '@repo/database';
import bcrypt from 'bcrypt';
import { error } from 'console';


export default class UserRepository {
    //for login
    async findByPhoneNumber(phoneNumber: string) {
        try {
            return prisma.users.findUnique({
                where: { phone_number: phoneNumber },
                select: {
                    id: true,
                    phone_number: true,
                    first_name: true,
                    last_name: true,
                    role: true,
                    password_hash: true
                }
            })
        } catch(error) {
            throw error;
        }
        
    }

    async createUser(phoneNumber: string, firstName: string, lastName: string, password: string) {
        try {
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const user = await prisma.users.create({
                data: {
                    phone_number: phoneNumber,
                    first_name: firstName,
                    last_name: lastName || '',
                    password_hash: hashedPassword,
                    role: 'customer',
                    status: 'active',
                },
            })

            if(!user) {
                return null;
            }

            return user;
        } catch {
            throw error;
        }
    }

    // async getPassword(phoneNumber: string) {
    //     return prisma.users.findUnique({
    //         where: { phone_number: phoneNumber },
    //         select: {
    //             password_hash: true
    //         }
    //     })
    // }

}


