# 40k - Wrath & Glory - character sheet

A sparkling new symbiote!


To do : 
- 1 voir comment stocker dans le cache mes inputs
        -> DONE
        -> Il faut un input textarea ou button -> doivent etre sur la page html initial


- 2 Refaire le systeme permettant de parse des action, dés et desc pour l'onglet arme
text.matchAll(/(.*) (\d{0,2}d\d{1,2}[+-]?\d*) ?(.*)/gi);
to be
text.matchAll(/(.*) ((?:\d{0,2}d\d{1,2}[+-]?\d*)+) ?(.*)/gi);
will allow for multiple damage dice combinations.
    -> DONE
    -> séparer les tables par ";". Dans range mettre melee ou les trois distances en valeur numérique et séparés par un espace. Pour AP et salvo mettre une valeur numérique entre 0-9 ou un "-"
        -> ex : - "Rapier;melee;1d6+1d6;-;-;Brutal !"
                - "Bolter;12 24 36;1d6+1d6;1;2;Brutal !"

- 3 cacher les notes pour rendre ça plus sympa
- 4 Reprendre le principe des armes en simplifié pour l'équipement, les capacités et les descriptions
- 5 intégrer le parser de résultats des dés warhammer
- 6 Faire du nettoyage et corrections (rename etc..)
