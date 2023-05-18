exports.userSignUpValidator = (req, res, next) => {
    console.log(req.body.data);
    req.check(req.body.data.name, 'Name is required').notEmpty();
    req.check(req.body.data.email, 'E-mail must be between 3 t 32 characters')
    req.check(req.body.data.password, 'Password is required').notEmpty();
    req.check(req.body.data.password)
        .isLength({
            min: 6
        })
        .withMessage('Password must contain at least 6 characters')

    const errors = req.validationErrors();

    if(errors) {
        const firstError = errors.map(error => error.msg)[0];
        return res.status(400).json({error: firstError});
    }

    next();
};