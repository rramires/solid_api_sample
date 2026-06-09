// TO REPLACE WITH SMTP/SendGrid/Resend: swap ConsoleEmailProvider for a concrete
// implementation of IEmailProvider and update this file.
import { ConsoleEmailProvider } from './console-email-provider'
import { IEmailProvider } from './i-email-provider'

export const emailProvider: IEmailProvider = new ConsoleEmailProvider()
