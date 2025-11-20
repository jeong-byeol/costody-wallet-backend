export declare class EmailService {
    private transporter;
    constructor();
    sendVerificationEmail(email: string, token: string): Promise<void>;
    sendWelcomeEmail(email: string, userName: string): Promise<void>;
}
