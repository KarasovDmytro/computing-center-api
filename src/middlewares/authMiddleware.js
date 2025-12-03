const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next(); 
    }

    return res.status(401).json({ 
        success: false, 
        message: 'Помилка доступу: Ви не авторизовані. Будь ласка, виконайте вхід через /auth/login' 
    });
    //res.redirect('/auth/login');
};

const hasRole = (roles) => {
    return (req, res, next) => {
        if(!req.session.user){
            res.redirect('/auth/login');
        }
    
    const userRole = req.session.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if(allowedRoles.includes(userRole)){
        return next();
    }

    return res.status(403).json({
        success: false,
        message: `Доступ заборонено! Ваша роль: ${userRole}, необхідна: ${allowedRoles.join(' або ')}`
    });

    };

};

module.exports = {
    isAuthenticated, 
    hasRole
};
