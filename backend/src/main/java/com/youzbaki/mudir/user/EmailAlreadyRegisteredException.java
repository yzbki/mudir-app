package com.youzbaki.mudir.user;

/** Thrown when an account already exists for an email (whether created by sign-up, Google, or a manager). */
public class EmailAlreadyRegisteredException extends RuntimeException {

    public EmailAlreadyRegisteredException() {
        super("An account with this email already exists. Log in instead, or use \"Continue with Google\" if you signed up with Google.");
    }
}
