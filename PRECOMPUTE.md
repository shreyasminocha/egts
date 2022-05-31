# Excerpt from Benaloh's "precomputation" design

Benaloh has three different constructions. This is based on his simplest, which precomputes encryptions of zero. This is slightly wasteful, but it means that we can have every worker computing the same thing, without having to juggle multiple kinds of precomputation results.

## Option 1 – A single buffer of encryptions of zero
The simplest approach to describe would be to generate a single buffer of encryptions of zero.  Each entry in the buffer would be a triple $(ρ,g^ρ  mod p,K^ρ  mod p)$ with $ρ$ selected at random from $Z_q$.  This triple can be thought of as a nonce followed by an encryption of zero using this nonce.

To encrypt a zero together with a proof take four values from the buffer:  $(X_1,Y_1,Z_1)$, $(X_2,Y_2,Z_2)$, $(X_3,Y_3,Z_3)$, and $(X_4,Y_4,Z_4)$.  Set the following values.

$R=X_1$
$u=X_2$
$v=X_3$
$w=X_4$

$(α,β)=(Y_1,Z_1)$
$(a_0,b_0 )=(Y_2,Z_2)$
$(a_1,b_1=Y_3,Y_4 Z_3  mod p)$

Proceed with computation of $c,c_0,c_1,v_0,v_1$, etc. as before.

To encrypt a one together with a proof take four values from the buffer:  $(X_1,Y_1,Z_1)$, $(X_2,Y_2,Z_2)$, $(X_3,Y_3,Z_3)$, and $(X_4,Y_4,Z_4)$.  Set the following values.

$R=X_1$
$u=X_2$
$v=X_3$
$w=X_4$
$(α,β)=(Y_1,gZ_1  mod p)$
$(a_0,b_0 )=(Y_3,Y_4 Z_3  mod p)$
$(a_1,b_1=Y_2,Z_2)$

Proceed with computation of $c,c_0,c_1,v_0,v_1$, etc. as before.

Note that in the above, the value $Z_4$ is never used.  This is a small waste that can be eliminated with a second buffer and will be addressed below.

To compute the selection limit proof, take one value from the buffer:  $(X,Y,Z)$.  Set the following values.

$U=X$
$(a,b)=(Y,Z)$

## Why not implement the fancier version?
Ideally, we'd have tasks just going as fast as possible to generate as many "1" and "0" encryptions as possible, and when the queues fill up they'd just block. Since we're going to encrypt many more zeros than ones, this would then avoid doing too much work on encrypting "1" values. It's certainly tempting, but we *don't seem to have any way to do bounded queues across workers in JavaScript*. 