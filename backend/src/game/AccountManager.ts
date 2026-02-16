
interface Account {
    username: string;
    password: string;
    stack: number;
    isOnline: boolean;
    socketId?: string;
}

export class AccountManager {
    private accounts: Map<string, Account> = new Map();
    private enableAccountRestriction: boolean;

    constructor(enableAccountRestriction: boolean = false) {
        this.enableAccountRestriction = enableAccountRestriction;
    }

    register(username: string, password: string): { success: boolean; message?: string } {
        if (this.accounts.has(username)) {
            return { success: false, message: '用户名已存在' };
        }

        this.accounts.set(username, {
            username,
            password,
            stack: 1000,
            isOnline: false
        });

        return { success: true };
    }

    login(username: string, password: string, socketId: string): { success: boolean; message?: string; stack?: number } {
        const account = this.accounts.get(username);

        if (!account) {
            this.register(username, password);
            const newAccount = this.accounts.get(username)!;
            newAccount.isOnline = true;
            newAccount.socketId = socketId;
            return { success: true, stack: newAccount.stack };
        }

        if (account.password !== password) {
            return { success: false, message: '密码错误' };
        }

        if (this.enableAccountRestriction && account.isOnline) {
            return { success: false, message: `账号"${username}"已在线，无法登录` };
        }

        account.isOnline = true;
        account.socketId = socketId;
        return { success: true, stack: account.stack };
    }

    logout(socketId: string) {
        for (const [username, account] of this.accounts.entries()) {
            if (account.socketId === socketId) {
                account.isOnline = false;
                account.socketId = undefined;
                break;
            }
        }
    }

    updateStack(socketId: string, stack: number) {
        for (const [username, account] of this.accounts.entries()) {
            if (account.socketId === socketId) {
                account.stack = stack;
                break;
            }
        }
    }

    getAccount(socketId: string): Account | undefined {
        for (const [username, account] of this.accounts.entries()) {
            if (account.socketId === socketId) {
                return account;
            }
        }
        return undefined;
    }
}
